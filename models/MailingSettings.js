const mongoose = require("mongoose");

const mailingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    senderName: { type: String, default: "PSG Institute of Technology and Applied Research" },
    sendFrom: { type: String, default: "" },
    replyTo: { type: String, default: "" },
    signature: { type: String, default: "With Best Regards,<br>PSG Institute of Technology and Applied Research" },
    platformLoginEnabled: { type: Boolean, default: true },
    creditsRemaining: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MailingSettings", mailingSettingsSchema);
