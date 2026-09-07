// backend/routes/donation.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const {
  createDonations,
  verifyRazorPay,
  getAllDonations,
  getDonationHistory,
  getDonationStats,
  getDonationById,
  updateDonation,
  deleteDonation,
  flagDonation,
  updateDonationStatus,
} = require("../controllers/donationController");

// 🔓 PUBLIC ROUTES - Anyone can access
router.post("/", createDonations);
router.post("/verify-razorpay", verifyRazorPay);

// 🔓 HISTORY & STATS routes - With filters and pagination
router.get("/history", adminAuth, getDonationHistory);
router.get("/stats", adminAuth, getDonationStats);

// 🔐 ADMIN ONLY - Get all donations
router.get("/", adminAuth, getAllDonations);

// 🔐 ADMIN ONLY - Get specific donation by ID
router.get("/:id", adminAuth, getDonationById);

// 🔐 ADMIN ONLY - Update donation (admin notes, status, etc.)
router.put("/:id", adminAuth, updateDonation);

// 🔐 ADMIN ONLY - Update donation status (pending, completed, failed, cancelled)
router.put("/:id/status", adminAuth, updateDonationStatus);

// 🔐 ADMIN ONLY - Flag/Unflag donation
router.put("/:id/flag", adminAuth, flagDonation);

// 🔐 ADMIN ONLY - Delete donation
router.delete("/:id", adminAuth, deleteDonation);

module.exports = router;