const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      default: null,  // ✅ Can be null for social logins
    },

    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
    },

    department: {
      type: String, // Only for department admin
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ NEW: OAuth Fields
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,  // Allows multiple null values
    },

    facebookId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,  // Allows multiple null values
    },

    profileImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);