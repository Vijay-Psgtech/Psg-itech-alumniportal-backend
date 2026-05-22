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
  socialLogin,  // ✅ NEW
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");
const { alumniUpload } = require("../middleware/alumniUploads");
const { generateAlumniId } = require("../middleware/generateAlumniId");

// Public routes
router.post("/register", generateAlumniId, alumniUpload, register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// ✅ NEW: Social Login Route (Google, Facebook)
router.post("/social-login", socialLogin);

// Protected routes (require valid JWT)
router.get("/profile", authMiddleware, getProfile);
router.put("/change-password", authMiddleware, changePassword);

module.exports = router;