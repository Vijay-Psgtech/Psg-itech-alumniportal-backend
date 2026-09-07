// backend/models/Donation.js
const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    // Donor Info
    donorName: {
      type: String,
      required: true,
      trim: true,
    },
    donorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    // Donation Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["INR", "USD"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Net Banking", "Card", "Cheque", "Wire Transfer"],
      required: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },

    // Payment Info
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      index: true,
    },
    paymentGateway: {
      type: String,
      enum: ["razorpay", "stripe", "manual"],
      default: null,
    },

    // Alumni Link (optional)
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      default: null,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Index for better query performance
donationSchema.index({ alumniId: 1, status: 1 });
donationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Donation", donationSchema);