const mongoose = require("mongoose");

const mentorshipSessionSchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      required: true,
    },
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      required: true,
    },
    topics: [{ type: String, trim: true }],
    requestedAt: { type: Date, default: Date.now },
    sessionDate: Date,
    status: {
      type: String,
      enum: [
        "awaiting_response",
        "awaiting_feedback",
        "upcoming",
        "completed",
        "cancelled",
      ],
      default: "awaiting_response",
    },
    mentorFeedback: String,
    menteeFeedback: String,
    mentorRating: { type: Number, min: 0, max: 5 },
    menteeRating: { type: Number, min: 0, max: 5 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MentorshipSession", mentorshipSessionSchema);
