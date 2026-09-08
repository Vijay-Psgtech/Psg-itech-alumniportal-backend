const express = require("express");
const mongoose = require("mongoose");
const Alumni = require("../models/Alumni");
const User = require("../models/Users");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const MessagingSettings = require("../models/MessagingSettings");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const basePersonFields =
  "_id firstName lastName email department batchYear occupation jobTitle files role isActive";

const toPersonObject = (person, roleOverride) => {
  if (!person) return null;
  const role =
    roleOverride || person.role || (person.isAdmin ? "admin" : "alumni");
  return {
    _id: person._id.toString(),
    firstName: person.firstName || "",
    lastName: person.lastName || "",
    email: person.email || "",
    department: person.department || "",
    batchYear: person.batchYear || "",
    occupation: person.occupation || "",
    jobTitle: person.jobTitle || "",
    files: person.files || {},
    role,
    isActive: person.isActive ?? true,
  };
};

const resolveCurrentMember = async (req) => {
  const role = req.user?.role;
  if (role === "admin" || role === "superadmin") {
    return User.findById(req.userId).select(basePersonFields);
  }

  return Alumni.findOne({
    _id: req.userId,
    role: "Alumni",
    isApproved: true,
  }).select(basePersonFields);
};

const fetchPeopleById = async (ids) => {
  const normalizedIds = [
    ...new Set(ids.filter(Boolean).map((id) => id.toString())),
  ];
  if (!normalizedIds.length) return {};

  const [alumniPeople, userPeople] = await Promise.all([
    Alumni.find({
      _id: { $in: normalizedIds },
      role: "Alumni",
      isApproved: true,
    })
      .select(basePersonFields)
      .lean(),
    User.find({
      _id: { $in: normalizedIds },
      role: { $in: ["admin", "superadmin"] },
      isActive: true,
    })
      .select(basePersonFields)
      .lean(),
  ]);

  const map = {};
  alumniPeople.forEach((person) => {
    map[person._id.toString()] = toPersonObject(person, "alumni");
  });
  userPeople.forEach((person) => {
    map[person._id.toString()] = toPersonObject(person, person.role || "admin");
  });

  return map;
};

const getContactsList = async (currentUserId, currentRole) => {
  const [approvedAlumni, activeAdmins] = await Promise.all([
    Alumni.find({ role: "Alumni", isApproved: true })
      .select(basePersonFields)
      .lean(),
    User.find({ role: { $in: ["admin", "superadmin"] }, isActive: true })
      .select(basePersonFields)
      .lean(),
  ]);

  const people = [
    ...approvedAlumni.map((person) => toPersonObject(person, "alumni")),
    ...activeAdmins.map((person) =>
      toPersonObject(person, person.role || "admin"),
    ),
  ].filter((person) => person && person._id !== currentUserId.toString());

  if (currentRole === "alumni") {
    return people;
  }

  return people;
};

const participantFilter = (id) => ({ participants: id });
const isParticipant = (conversation, id) =>
  conversation.participants.some(
    (participant) => participant.toString() === id.toString(),
  );

router.get("/settings", async (req, res) => {
  const member = await resolveCurrentMember(req);
  if (!member)
    return res.status(403).json({ message: "Approved member access required" });

  const settings = await MessagingSettings.findOneAndUpdate(
    { alumniId: member._id },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true, settings });
});

router.patch("/settings", async (req, res) => {
  const member = await resolveCurrentMember(req);
  if (!member)
    return res.status(403).json({ message: "Approved member access required" });

  const allowed = ["showOnlineStatus", "readReceipts", "messageNotifications"];
  const updates = Object.fromEntries(
    allowed
      .filter((key) => req.body[key] !== undefined)
      .map((key) => [key, Boolean(req.body[key])]),
  );
  const settings = await MessagingSettings.findOneAndUpdate(
    { alumniId: member._id },
    updates,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true, settings });
});

router.post("/presence/heartbeat", async (req, res) => {
  const member = await resolveCurrentMember(req);
  if (!member)
    return res.status(403).json({ message: "Approved member access required" });

  await MessagingSettings.findOneAndUpdate(
    { alumniId: member._id },
    { lastSeen: new Date() },
    { upsert: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true });
});

router.get("/presence", async (req, res) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const settings = await MessagingSettings.find({ alumniId: { $in: ids } })
    .select("alumniId lastSeen showOnlineStatus")
    .lean();
  const onlineLimit = Date.now() - 90 * 1000;
  res.json({
    success: true,
    presence: settings.map((setting) => ({
      ...setting,
      online:
        setting.showOnlineStatus &&
        setting.lastSeen &&
        new Date(setting.lastSeen).getTime() > onlineLimit,
    })),
  });
});

router.get("/contacts", async (req, res) => {
  const member = await resolveCurrentMember(req);
  if (!member)
    return res.status(403).json({ message: "Approved member access required" });

  const contacts = await getContactsList(member._id, req.user?.role);
  res.json({ success: true, contacts });
});

router.get("/conversations", async (req, res) => {
  const member = await resolveCurrentMember(req);
  if (!member)
    return res.status(403).json({ message: "Approved member access required" });

  const conversations = await Conversation.find(participantFilter(member._id))
    .sort({ lastMessageAt: -1 })
    .lean();
  const participantIds = [
    ...new Set(
      conversations.flatMap((conversation) =>
        (conversation.participants || []).map((participant) =>
          participant.toString(),
        ),
      ),
    ),
  ];
  const participantMap = await fetchPeopleById(participantIds);

  const formattedConversations = conversations.map((conversation) => ({
    ...conversation,
    participants: (conversation.participants || [])
      .map((participantId) => participantMap[participantId.toString()])
      .filter(Boolean),
  }));

  res.json({ success: true, conversations: formattedConversations });
});

router.post("/conversations", async (req, res) => {
  const member = await resolveCurrentMember(req);
  const { recipientId } = req.body;

  if (!member || !mongoose.Types.ObjectId.isValid(recipientId)) {
    return res.status(400).json({ message: "A valid recipient is required" });
  }

  if (recipientId.toString() === member._id.toString()) {
    return res.status(400).json({ message: "You cannot message yourself" });
  }

  const recipient = await fetchPeopleById([recipientId]);
  const selectedRecipient = recipient[recipientId.toString()];

  if (!selectedRecipient) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  const participantIds = [member._id, selectedRecipient._id].sort((a, b) =>
    a.toString().localeCompare(b.toString()),
  );
  let conversation = await Conversation.findOne({
    participants: { $all: participantIds, $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: participantIds,
      unreadCounts: {
        [member._id.toString()]: 0,
        [selectedRecipient._id.toString()]: 0,
      },
    });
  }

  const conversationPayload = {
    ...conversation.toObject(),
    participants: [
      selectedRecipient,
      toPersonObject(member, req.user?.role || "member"),
    ],
  };

  res.status(201).json({ success: true, conversation: conversationPayload });
});

router.get("/conversations/:id/messages", async (req, res) => {
  const member = await resolveCurrentMember(req);
  const conversation = await Conversation.findById(req.params.id);

  if (!member || !conversation || !isParticipant(conversation, member._id)) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();
  const userIds = [
    ...new Set(
      messages.flatMap((message) => [
        message.sender.toString(),
        message.recipient.toString(),
      ]),
    ),
  ];
  const participantMap = await fetchPeopleById(userIds);

  const formattedMessages = messages.map((message) => ({
    ...message,
    sender: participantMap[message.sender.toString()] || null,
    recipient: participantMap[message.recipient.toString()] || null,
  }));

  res.json({ success: true, messages: formattedMessages });
});

router.post("/conversations/:id/messages", async (req, res) => {
  const member = await resolveCurrentMember(req);
  const conversation = await Conversation.findById(req.params.id);

  if (!member || !conversation || !isParticipant(conversation, member._id)) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const recipientId = conversation.participants.find(
    (participant) => participant.toString() !== member._id.toString(),
  );
  if (!req.body.body?.trim())
    return res.status(400).json({ message: "Message cannot be empty" });

  const message = await Message.create({
    conversationId: conversation._id,
    sender: member._id,
    recipient: recipientId,
    body: req.body.body.trim(),
  });

  conversation.lastMessage = message.body;
  conversation.lastMessageAt = message.createdAt;
  conversation.unreadCounts.set(
    recipientId.toString(),
    (conversation.unreadCounts.get(recipientId.toString()) || 0) + 1,
  );
  await conversation.save();

  const participantMap = await fetchPeopleById([
    member._id.toString(),
    recipientId.toString(),
  ]);
  res.status(201).json({
    success: true,
    message: {
      ...message.toObject(),
      sender: participantMap[member._id.toString()] || null,
      recipient: participantMap[recipientId.toString()] || null,
    },
  });
});

router.patch("/conversations/:id/read", async (req, res) => {
  const member = await resolveCurrentMember(req);
  const conversation = await Conversation.findById(req.params.id);

  if (!member || !conversation || !isParticipant(conversation, member._id)) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  await Message.updateMany(
    { conversationId: conversation._id, recipient: member._id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  conversation.unreadCounts.set(member._id.toString(), 0);
  await conversation.save();
  res.json({ success: true });
});

module.exports = router;
