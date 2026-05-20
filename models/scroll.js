const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
      default: "",
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [300, "Message cannot exceed 300 characters"],
    },
    type: {
      type: String,
      enum: {
        values: ["info", "success", "warning", "error"],
        message: "Type must be info, success, warning, or error",
      },
      default: "info",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
      sparse: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metadata: {
      viewCount: {
        type: Number,
        default: 0,
      },
      dismissCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    collection: "notification_scrolls",  // ✅ Changed collection name too
  }
);

// Index for faster queries
notificationSchema.index({ isActive: 1, displayOrder: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { sparse: true });

// Pre-query hook to exclude expired notifications
notificationSchema.query.active = function () {
  return this.find({
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
};

// ✅ FIXED: Changed model name from "Notification" to "NotificationScroll"
module.exports = mongoose.model("NotificationScroll", notificationSchema);