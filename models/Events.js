// backend/models/Event.js
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    venue: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String },
    status: {
      type: String,
      enum: ["upcoming", "completed"],
      default: "upcoming",
    },
    attendees: { type: Number, default: 0 },
    category: {
      type: String,
      enum: [
        "Awards",
        "Lecture",
        "Sports",
        "Memorial",
        "Congress",
        "Workshop",
        "Networking",
        "Cultural",
        "Other",
      ],
      default: "Other",
    },
    highlight: { type: Boolean, default: false },
    tags: [String],
    speakers: [
      {
        name: String,
        role: String,
        avatar: String,
      },
    ],
    schedule: [
      {
        time: String,
        title: String,
        icon: String,
      },
    ],
    highlights: [String],
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Event", eventSchema);
