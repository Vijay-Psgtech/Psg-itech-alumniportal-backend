// server/models/Chapter.js
// ✅ Alumni Chapters Model - Fixed with foundedBy + isSuspended fields

const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: [true, "Chapter title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    content: {
      type: String,
      default: "",
    },

    // Location & Category
    location: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      enum: ["regional", "professional", "interest", "industry", "international", "batch"],
      default: "regional",
    },

    tags: {
      type: [String],
      default: [],
    },

    // Banner Image
    bannerImage: {
      type: String,
      default: null,
    },

    // ✅ FIXED: foundedBy was missing from schema but indexed — added here
    foundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      default: null,
    },

    // Members
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Alumni",
      },
    ],

    memberCount: {
      type: Number,
      default: 0,
    },

    // Admin Approval System
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // ✅ FIXED: isSuspended was missing from schema but indexed — added here
    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    suspendReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // auto manages createdAt + updatedAt — no need to define manually
  }
);

// Auto-update memberCount before save
chapterSchema.pre("save", function () {
  if (this.members) {
    this.memberCount = this.members.length;
  }
});
// Text index for search
chapterSchema.index({ title: "text", description: "text", location: "text" });

// Indexes for query optimization (removed duplicates that caused warnings)
chapterSchema.index({ status: 1, createdAt: -1 });
chapterSchema.index({ category: 1 });
chapterSchema.index({ foundedBy: 1 });
chapterSchema.index({ isSuspended: 1 });

module.exports = mongoose.model("Chapter", chapterSchema);