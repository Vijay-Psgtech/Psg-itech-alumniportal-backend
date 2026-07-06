// backend/models/Album.js
const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    event: { type: String, required: true },
    date: { type: String, required: true },
    photos: { type: Number, default: 0 },
    accent: { type: String, default: "#b8882a" },
    tags: [String],
    images: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Album", albumSchema);
