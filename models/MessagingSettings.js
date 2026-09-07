const mongoose = require("mongoose");

const messagingSettingsSchema = new mongoose.Schema(
  {
    alumniId: { type: mongoose.Schema.Types.ObjectId, ref: "Alumni", unique: true, required: true },
    showOnlineStatus: { type: Boolean, default: true },
    readReceipts: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true },
    lastSeen: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("MessagingSettings", messagingSettingsSchema);
