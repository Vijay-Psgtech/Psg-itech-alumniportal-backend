const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Banner description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [100, "Subtitle cannot exceed 100 characters"],
      default: "",
    },
    backgroundImage: {
      type: String,
      default: "https://via.placeholder.com/1600x900",
    },
    features: [
      {
        icon: {
          type: String,
          enum: ["Users", "Globe", "Sparkles", "Zap"],
          default: "Sparkles",
        },
        text: {
          type: String,
          required: [true, "Feature text is required"],
          trim: true,
          maxlength: [100, "Feature text cannot exceed 100 characters"],
        },
      },
    ],
    primaryButtonText: {
      type: String,
      default: "Join Now",
      trim: true,
      maxlength: [50, "Button text cannot exceed 50 characters"],
    },
    secondaryButtonText: {
      type: String,
      default: "Learn More",
      trim: true,
      maxlength: [50, "Button text cannot exceed 50 characters"],
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "banners",
  }
);

// Index for faster queries
bannerSchema.index({ isActive: 1, createdAt: -1 });

// Pre-save hook to ensure only one active banner
bannerSchema.pre("save", async function (next) {
  if (this.isActive) {
    await mongoose.model("Banner").updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

module.exports = mongoose.model("Banner", bannerSchema);