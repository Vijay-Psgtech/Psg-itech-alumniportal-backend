// backend/models/Department.js
const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      maxlength: [100, "Department name cannot exceed 100 characters"],
    },
    degree: {
      type: String,
      required: [true, "Degree is required"],
      trim: true,
      maxlength: [100, "Degree cannot exceed 100 characters"],
    },
    programmeType: {
      type: String,
      enum: ["UG", "PG"],
      required: [true, "Programme type is required"],
    },
    fundingType: {
      type: String,
      enum: ["Aided", "SF"],
      required: [true, "Funding type is required"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      required: [true, "Creator ID is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
departmentSchema.index({ programmeType: 1, fundingType: 1 });
departmentSchema.index({ active: 1 });
departmentSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Department", departmentSchema);