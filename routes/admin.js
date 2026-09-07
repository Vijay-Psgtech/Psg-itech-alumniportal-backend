const express = require("express");
const {
  getPendingAlumni,
  approveAlumni,
  rejectAlumni,
  makeAdmin,
} = require("../controllers/adminController");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// All routes require valid JWT + admin flag
router.use(authMiddleware, adminMiddleware);

router.get("/pending", getPendingAlumni);
router.put("/approve/:id", approveAlumni);
router.put("/reject/:id", rejectAlumni);

module.exports = router;
