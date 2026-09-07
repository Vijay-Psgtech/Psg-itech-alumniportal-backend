const express = require("express");
const mongoose = require("mongoose");
const Alumni = require("../models/Alumni");
const MentorshipProfile = require("../models/MentorshipProfile");
const MentorshipSession = require("../models/MentorshipSession");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();
router.use(adminAuth);

const profileQuery = (type, search) => {
  const filter = type ? { type } : {};
  return MentorshipProfile.find(filter)
    .populate({ path: "alumniId", select: "firstName lastName email department batchYear occupation jobTitle currentCompany files" })
    .sort({ updatedAt: -1 })
    .then((profiles) => search ? profiles.filter((profile) => `${profile.alumniId?.firstName || ""} ${profile.alumniId?.lastName || ""} ${profile.alumniId?.email || ""}`.toLowerCase().includes(search.toLowerCase())) : profiles);
};

router.get("/dashboard", async (_req, res) => {
  const [mentorProfiles, menteeProfiles, sessions] = await Promise.all([
    MentorshipProfile.find({ type: "mentor", status: "active" }),
    MentorshipProfile.find({ type: "mentee", status: "active" }),
    MentorshipSession.find(),
  ]);
  const recentCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newProfiles = [...mentorProfiles, ...menteeProfiles].filter((profile) => profile.createdAt >= recentCutoff).length;
  res.json({ success: true, stats: {
    totalMentors: mentorProfiles.length,
    totalMentees: menteeProfiles.length,
    awaitingFeedback: sessions.filter((session) => session.status === "awaiting_feedback").length,
    awaitingResponse: sessions.filter((session) => session.status === "awaiting_response").length,
    upcomingSessions: sessions.filter((session) => session.status === "upcoming").length,
    completedSessions: sessions.filter((session) => session.status === "completed").length,
    newProfiles,
    totalSessions: sessions.length,
  } });
});

router.get("/profiles", async (req, res) => {
  const profiles = await profileQuery(req.query.type, req.query.search);
  res.json({ success: true, count: profiles.length, profiles });
});

router.get("/sessions", async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const sessions = await MentorshipSession.find(filter)
    .populate("mentor", "firstName lastName email")
    .populate("mentee", "firstName lastName email")
    .sort({ requestedAt: -1 });
  res.json({ success: true, count: sessions.length, sessions });
});

router.post("/profiles", async (req, res) => {
  const { alumniId, type, helpTopics, bio } = req.body;
  if (!mongoose.Types.ObjectId.isValid(alumniId) || !["mentor", "mentee"].includes(type)) return res.status(400).json({ success: false, message: "Valid alumni and profile type are required" });
  const alumni = await Alumni.findOne({ _id: alumniId, role: "Alumni", isApproved: true });
  if (!alumni) return res.status(404).json({ success: false, message: "Approved alumni not found" });
  const profile = await MentorshipProfile.findOneAndUpdate({ alumniId }, { type, helpTopics: helpTopics || [], bio: bio || "", status: "active" }, { new: true, upsert: true, setDefaultsOnInsert: true });
  res.status(201).json({ success: true, profile });
});

router.put("/profiles/:id", async (req, res) => {
  const profile = await MentorshipProfile.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!profile) return res.status(404).json({ success: false, message: "Mentorship profile not found" });
  res.json({ success: true, profile });
});

router.post("/sessions", async (req, res) => {
  const { mentor, mentee, topics, sessionDate, status } = req.body;
  if (!mongoose.Types.ObjectId.isValid(mentor) || !mongoose.Types.ObjectId.isValid(mentee)) return res.status(400).json({ success: false, message: "Valid mentor and mentee are required" });
  const session = await MentorshipSession.create({ mentor, mentee, topics: topics || [], sessionDate, status: status || "awaiting_response" });
  res.status(201).json({ success: true, session });
});

router.put("/sessions/:id", async (req, res) => {
  const session = await MentorshipSession.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!session) return res.status(404).json({ success: false, message: "Mentorship session not found" });
  res.json({ success: true, session });
});

module.exports = router;
