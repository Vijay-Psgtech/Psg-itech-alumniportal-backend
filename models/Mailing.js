const mongoose = require("mongoose");

const mailingSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    senderName: { type: String, required: true, trim: true },
    senderEmail: { type: String, required: true, trim: true, lowercase: true },
    replyTo: { type: String, trim: true, lowercase: true },
    html: { type: String, required: true },
    recipientType: { type: String, enum: ["all", "filtered", "specific"], default: "all" },
    recipientFilter: {
      department: { type: String, trim: true },
      batchYear: { type: String, trim: true },
    },
    recipients: [
      {
        name: String,
        email: { type: String, lowercase: true, trim: true },
      },
    ],
    status: { type: String, enum: ["Draft", "Sent", "Failed"], default: "Draft" },
    scheduledAt: Date,
    sentAt: Date,
    metrics: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    lastError: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Mailing", mailingSchema);
