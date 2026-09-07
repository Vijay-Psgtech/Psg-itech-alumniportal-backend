const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    category: {
      type: String,
      enum: ["Newsletters", "Alumni Stories", "Accolades/Accreditations", "Institute Updates", "Events"],
      default: "Newsletters",
    },
    description: { type: String, required: true },
    imageUrl: { type: String },
    pdfUrl: { type: String },
    tags: [String],
    author: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Newsletter", newsletterSchema);