const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    // Basic Campaign Info
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Nostalgic Stories",
        "Alumni in Spotlight",
        "Entrepreneur Stories",
        "Awards & Recognition",
        "Placement Drive",
        "Internship Program",
        "Special Celebrations",
        "Survey",
        "Event Planning",
        "Other",
      ],
      required: true,
    },
    templateId: {
      type: String,
      // References a predefined template
    },

    // Campaign Timeline
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      // Duration in days (1-365 or infinite)
      required: true,
      default: 14,
    },

    // Campaign Status
    status: {
      type: String,
      enum: ["Draft", "Active", "Paused", "Closed", "Archived"],
      default: "Draft",
    },

    // Campaign Settings
    coverImage: String,
    targetAudience: {
      type: [String],
      enum: ["All Alumni", "Batch Wise", "Department Wise", "Faculty", "Ambassadors"],
      default: ["All Alumni"],
    },
    specificBatches: [String],
    specificDepartments: [String],

    // Form Configuration
    formFields: [
      {
        fieldId: String,
        fieldName: String,
        fieldType: {
          type: String,
          enum: ["text", "textarea", "email", "phone", "select", "radio", "checkbox", "file", "date"],
        },
        label: String,
        placeholder: String,
        required: Boolean,
        options: [String], // For select, radio, checkbox
        maxLength: Number,
        minLength: Number,
      },
    ],

    // Response Tracking
    totalResponses: {
      type: Number,
      default: 0,
    },
    responses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CampaignResponse",
      },
    ],

    // Publishing Settings
    allowPublishing: {
      type: Boolean,
      default: true,
      // Allow publishing responses as stories
    },
    publishedStories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story", // References published stories
      },
    ],

    // Notifications
    sendNotifications: {
      type: Boolean,
      default: true,
    },
    notificationTemplate: String,
    sendConfirmationEmail: {
      type: Boolean,
      default: true,
    },

    // Creator & Permissions
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    formOpens: {
      type: Number,
      default: 0,
    },
    submissionRate: {
      type: Number,
      default: 0,
      // Calculated: (totalResponses / formOpens) * 100
    },

    // Meta
    tags: [String],
    isTemplate: {
      type: Boolean,
      default: false,
      // If true, this campaign can be used as a template
    },
    templateDescription: String,

    createdAt: {
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

module.exports = mongoose.model("Campaign", campaignSchema);