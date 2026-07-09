const mongoose = require("mongoose");

const campaignResponseSchema = new mongoose.Schema(
  {
    // Reference to Campaign
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },

    // Respondent Info
    respondentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Can be null for guest/anonymous responses
    },
    respondentName: String,
    respondentEmail: {
      type: String,
      required: true,
    },
    respondentBatch: String,
    respondentDepartment: String,

    // Response Data - Dynamic based on campaign form fields
    responseData: {
      type: mongoose.Schema.Types.Mixed,
      // Stores all form responses as key-value pairs
      // Example: { "name": "John", "story": "...", "photo": "..." }
    },

    // File Uploads
    uploadedFiles: [
      {
        fieldName: String,
        fileName: String,
        filePath: String,
        fileType: String,
        uploadedAt: Date,
      },
    ],

    // Response Status
    status: {
      type: String,
      enum: ["Submitted", "Viewed", "Published", "Rejected", "Flagged"],
      default: "Submitted",
    },

    // Publishing
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedStoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
    },
    publishedTitle: String,
    publishedContent: String,
    publishedAt: Date,

    // Admin Notes
    adminNotes: String,
    adminRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // Approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectionReason: String,

    // Engagement
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },

    // Metadata
    ipAddress: String,
    userAgent: String,
    responseTime: Number, // Time taken to fill form in seconds
    completionPercentage: Number,

    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
campaignResponseSchema.index({ campaignId: 1, submittedAt: -1 });
campaignResponseSchema.index({ respondentEmail: 1 });
campaignResponseSchema.index({ status: 1 });

module.exports = mongoose.model("CampaignResponse", campaignResponseSchema);