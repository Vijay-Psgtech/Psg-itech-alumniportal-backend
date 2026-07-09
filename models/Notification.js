// backend/models/Notification.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // Sender
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      required: true,
    },
    senderName: { type: String, required: true },
    senderEmail: { type: String },

    // Content
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Attachment (PDF or Image)
    attachment: {
      filename: { type: String },
      originalName: { type: String },
      mimetype: { type: String },      // 'application/pdf' | 'image/...'
      path: { type: String },
      size: { type: Number },
    },

    // Audience
    audienceType: {
      type: String,
      enum: ["all", "batch"],          // "all" = entire alumni | "batch" = specific batch
      default: "all",
    },
    targetBatch: {
      type: String,                    // e.g. "2020-2024", populated when audienceType === "batch"
      default: null,
    },

    // Admin approval workflow
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },   // rejection reason etc.
    approvedAt: { type: Date },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ status: 1 });
NotificationSchema.index({ senderId: 1 });
NotificationSchema.index({ audienceType: 1, targetBatch: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);