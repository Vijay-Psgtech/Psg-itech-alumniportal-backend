const express = require("express");
const mongoose = require("mongoose");
const Mailing = require("../models/Mailing");
const MailingTemplate = require("../models/MailingTemplate");
const MailingSettings = require("../models/MailingSettings");
const Alumni = require("../models/Alumni");
const { transporter } = require("../config/mailer");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();
router.use(adminAuth);

router.get("/templates", async (_req, res) => {
  const templates = await MailingTemplate.find().sort({ updatedAt: -1 });
  res.json({ success: true, count: templates.length, templates });
});

router.post("/templates", async (req, res) => {
  const { name, subject, html, category } = req.body;
  if (!name?.trim() || !subject?.trim() || !html?.trim())
    return res
      .status(400)
      .json({
        success: false,
        message: "Template name, subject, and message are required",
      });
  const template = await MailingTemplate.create({
    name,
    subject,
    html,
    category,
    createdBy: req.userId,
  });
  res.status(201).json({ success: true, template });
});

router.delete("/templates/:id", async (req, res) => {
  const template = await MailingTemplate.findByIdAndDelete(req.params.id);
  if (!template)
    return res
      .status(404)
      .json({ success: false, message: "Template not found" });
  res.json({ success: true });
});

const cleanRecipients = (recipients = []) =>
  recipients
    .filter((recipient) => recipient?.email)
    .map((recipient) => ({
      name: recipient.name || "Alumni",
      email: recipient.email.trim().toLowerCase(),
    }));

const resolveRecipients = async (mailing) => {
  if (mailing.recipientType === "specific")
    return cleanRecipients(mailing.recipients);
  const filter = { role: "Alumni", isApproved: true };
  if (mailing.recipientType === "filtered") {
    if (mailing.recipientFilter?.department)
      filter.department = mailing.recipientFilter.department;
    if (mailing.recipientFilter?.batchYear)
      filter.batchYear = mailing.recipientFilter.batchYear;
  }
  const alumni = await Alumni.find(filter)
    .select("firstName lastName email")
    .lean();
  return cleanRecipients(
    alumni.map((alumnus) => ({
      name: `${alumnus.firstName || ""} ${alumnus.lastName || ""}`.trim(),
      email: alumnus.email,
    })),
  );
};

router.get("/settings", async (_req, res) => {
  const settings = await MailingSettings.findOneAndUpdate(
    { key: "default" },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true, settings });
});

router.put("/settings", async (req, res) => {
  const allowed = [
    "senderName",
    "sendFrom",
    "replyTo",
    "signature",
    "platformLoginEnabled",
  ];
  const updates = Object.fromEntries(
    allowed
      .filter((key) => req.body[key] !== undefined)
      .map((key) => [key, req.body[key]]),
  );
  const settings = await MailingSettings.findOneAndUpdate(
    { key: "default" },
    updates,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true, settings });
});

router.get("/analytics", async (_req, res) => {
  const [mailings, settings] = await Promise.all([
    Mailing.find().sort({ createdAt: -1 }).lean(),
    MailingSettings.findOne({ key: "default" }).lean(),
  ]);
  const totals = mailings.reduce(
    (summary, mailing) => {
      Object.keys(summary).forEach((key) => {
        summary[key] += mailing.metrics?.[key] || 0;
      });
      return summary;
    },
    { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 },
  );
  res.json({
    success: true,
    totals,
    mailings: mailings.slice(0, 20),
    creditsRemaining: settings?.creditsRemaining || 0,
  });
});

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const mailings = await Mailing.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: mailings.length, mailings });
});

router.post("/", async (req, res) => {
  const {
    subject,
    html,
    senderName,
    senderEmail,
    replyTo,
    recipientType,
    recipientFilter,
    recipients,
    scheduledAt,
  } = req.body;
  if (!subject?.trim() || !html?.trim() || !senderEmail?.trim())
    return res
      .status(400)
      .json({
        success: false,
        message: "Subject, sender email, and message are required",
      });
  const mailing = await Mailing.create({
    subject: subject.trim(),
    html,
    senderName:
      senderName || "PSG Institute of Technology and Applied Research",
    senderEmail,
    replyTo,
    recipientType,
    recipientFilter,
    recipients: cleanRecipients(recipients),
    scheduledAt,
    createdBy: req.userId,
  });
  res.status(201).json({ success: true, mailing });
});

router.put("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid mailing id" });
  const editable = [
    "subject",
    "html",
    "senderName",
    "senderEmail",
    "replyTo",
    "recipientType",
    "recipientFilter",
    "recipients",
    "scheduledAt",
  ];
  const updates = Object.fromEntries(
    editable
      .filter((key) => req.body[key] !== undefined)
      .map((key) => [key, req.body[key]]),
  );
  if (updates.recipients)
    updates.recipients = cleanRecipients(updates.recipients);
  const mailing = await Mailing.findOneAndUpdate(
    { _id: req.params.id, status: "Draft" },
    updates,
    { new: true, runValidators: true },
  );
  if (!mailing)
    return res.status(404).json({ success: false, message: "Draft not found" });
  res.json({ success: true, mailing });
});

router.delete("/:id", async (req, res) => {
  const mailing = await Mailing.findOneAndDelete({
    _id: req.params.id,
    status: "Draft",
  });
  if (!mailing)
    return res.status(404).json({ success: false, message: "Draft not found" });
  res.json({ success: true });
});

router.post("/:id/send", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid mailing id" });
  const mailing = await Mailing.findOne({
    _id: req.params.id,
    status: "Draft",
  });
  if (!mailing)
    return res.status(404).json({ success: false, message: "Draft not found" });
  const recipients = await resolveRecipients(mailing);
  if (!recipients.length)
    return res
      .status(400)
      .json({
        success: false,
        message: "No approved alumni match this recipient selection",
      });
  try {
    await transporter.verify();
    const result = await transporter.sendMail({
      from: `${mailing.senderName} <${mailing.senderEmail}>`,
      to: mailing.senderEmail,
      bcc: recipients.map((recipient) => recipient.email).join(","),
      replyTo: mailing.replyTo || mailing.senderEmail,
      subject: mailing.subject,
      html: mailing.html,
    });
    mailing.recipients = recipients;
    mailing.status = "Sent";
    mailing.sentAt = new Date();
    mailing.metrics = {
      sent: recipients.length,
      delivered: recipients.length,
      opened: 0,
      clicked: 0,
      failed: 0,
    };
    mailing.lastError = result.messageId;
    await mailing.save();
    return res.json({ success: true, mailing });
  } catch (error) {
    mailing.status = "Failed";
    mailing.lastError = error.message;
    mailing.metrics = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: recipients.length,
    };
    await mailing.save();
    return res
      .status(502)
      .json({
        success: false,
        message: "Email provider rejected the send",
        error: error.message,
        mailing,
      });
  }
});

module.exports = router;
