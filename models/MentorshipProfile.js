const mongoose = require("mongoose");

const mentorshipProfileSchema = new mongoose.Schema(
  {
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      required: true,
      unique: true,
    },
    type: { type: String, enum: ["mentor", "mentee"], required: true },
    helpTopics: [{ type: String, trim: true }],
    bio: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    sessionsCompleted: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MentorshipProfile", mentorshipProfileSchema);
