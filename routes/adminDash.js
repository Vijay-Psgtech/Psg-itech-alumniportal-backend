const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const {
  getAllAlumniForAdmin,
  getDashboardStats,
  getAllDonations,
} = require("../controllers/adminDashController");

// All routes protected with adminAuth middleware
router.use(adminAuth); // Protect all routes below

// Get all alumni
router.get("/alumni/all", getAllAlumniForAdmin);

// ============ DONATION MANAGEMENT ROUTES ============
// Get all donations
router.get("/donations/all", getAllDonations);

// ============ STATISTICS ROUTE ============
// Get dashboard statistics
router.get("/stats", getDashboardStats);

module.exports = router;
