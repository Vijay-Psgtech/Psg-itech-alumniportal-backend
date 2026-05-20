// backend/routes/donation.js
const express = require("express");
const router = express.Router();
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
router.get("/history", getDonationHistory);
router.get("/stats", getDonationStats);

// 🔐 ADMIN ONLY - Get all donations
router.get("/", getAllDonations);

// 🔐 ADMIN ONLY - Get specific donation by ID
router.get("/:id", getDonationById);

// 🔐 ADMIN ONLY - Update donation (admin notes, status, etc.)
router.put("/:id", updateDonation);

// 🔐 ADMIN ONLY - Update donation status (pending, completed, failed, cancelled)
router.put("/:id/status", updateDonationStatus);

// 🔐 ADMIN ONLY - Flag/Unflag donation
router.put("/:id/flag", flagDonation);

// 🔐 ADMIN ONLY - Delete donation
router.delete("/:id", deleteDonation);

module.exports = router;