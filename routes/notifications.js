// backend/routes/notifications.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const {
  createNotification,
  getMyNotifications,
  getMySubmissions,
  adminGetAll,
  adminApprove,
  adminReject,
  adminDelete,
} = require("../controllers/notificationController");

/* ── Multer setup for notification attachments ──────────────────── */
const uploadDir = "uploads/notifications";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only images (jpg/png/webp) and PDF files are allowed"),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size must be under 5 MB" });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

/* ── Alumni Routes ──────────────────────────────────────────────── */
// POST  /api/notifications          → submit new notification
router.post(
  "/",
  authMiddleware,
  upload.single("attachment"),
  createNotification,
);

router.post(
  "/",
  authMiddleware,
  upload.single("attachment"),
  handleMulterError, // ✅ ADD THIS
  createNotification,
);

// GET   /api/notifications          → get approved notifications for this alumni
router.get("/", authMiddleware, getMyNotifications);

// GET   /api/notifications/mine     → see own submission history
router.get("/mine", authMiddleware, getMySubmissions);

/* ── Admin Routes ───────────────────────────────────────────────── */
// GET   /api/notifications/admin/all          → all notifications (filter by status)
router.get("/admin/all", authMiddleware, adminMiddleware, adminGetAll);

// PUT   /api/notifications/admin/:id/approve  → approve
router.put("/admin/:id/approve", authMiddleware, adminMiddleware, adminApprove);

// PUT   /api/notifications/admin/:id/reject   → reject
router.put("/admin/:id/reject", authMiddleware, adminMiddleware, adminReject);

// DELETE /api/notifications/admin/:id         → delete
router.delete("/admin/:id", authMiddleware, adminMiddleware, adminDelete);

module.exports = router;
