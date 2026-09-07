// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");
const { alumniUpload } = require("../middleware/alumniUploads");
const { generateAlumniId } = require("../middleware/generateAlumniId");
const rateLimit = require("../middleware/rateLimit");

const sensitiveAuthLimit = rateLimit({ max: 10, message: "Too many authentication attempts. Please try again later." });
const otpLimit = rateLimit({ max: 5, message: "Too many OTP requests. Please try again later." });

// Public routes
router.post("/register", generateAlumniId, alumniUpload, register);
router.post("/login", sensitiveAuthLimit, login);
router.post("/logout", logout);
router.post("/forgot-password", otpLimit, forgotPassword);
router.post("/verify-otp", otpLimit, verifyOtp);
router.post("/reset-password", otpLimit, resetPassword);

// Protected routes (require valid JWT)
router.get("/profile", authMiddleware, getProfile);
router.put("/change-password", authMiddleware, changePassword);

module.exports = router;
