const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();
connectDB();

// ── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5000",
  "https://alumnitestpsgcas.psginstitutions.in",
  "https://alumni.psgcas.ac.in",
  "https://www.alumni.psgcas.ac.in",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// ── Health check ─────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ message: "Server is running", status: "OK" }),
);

// ── Routes ───────────────────────────────────────────────────────
// Auth: register, login, forgot-password, verify-otp, reset-password, profile
app.use("/api/auth", require("./routes/auth"));

// ✅ NEW: DEPARTMENTS API (Dynamic departments management)
app.use("/api/departments", require("./routes/departments"));

// Chapters must be mounted before /api/alumni, otherwise /api/alumni/:id catches /api/alumni/chapters
app.use("/api/alumni/chapters", require("./routes/chapters"));

// Alumni directory (public + protected profile update)
app.use("/api/alumni", require("./routes/alumni"));

// Admin simple routes (approve/reject/stats) — uses Alumni model + isAdmin flag
app.use("/api/admin", require("./routes/admin"));

// Admin dashboard (full alumni mgmt + donations + stats)
app.use("/api/admin/dashboard", require("./routes/adminDash"));

// ── NEW: EVENTS API (Create, Read, Update, Delete) ───────────────
app.use("/api/events", require("./routes/events"));

// ── NEW: ALBUMS API (Create, Read, Update, Delete) ───────────────
app.use("/api/albums", require("./routes/albums"));

// ── NEW: NEWSLETTERS API (Create, Read, Update, Delete) ───────────────
app.use("/api/newsletters", require("./routes/newsletters"));

// Donations (public create + protected mine + admin all)
app.use("/api/donations", require("./routes/donation"));

// Chapters
app.use("/api/alumni/chapters", require("./routes/chapters"));

// ✅ FIXED: Notifications for alumni submission (admin approve/reject)
// This uses the "notifications" model for alumni to submit notifications
app.use("/api/notifications", require("./routes/notifications"));

// Reports routes for admin
app.use("/api/reports", require("./routes/adminReports"));

// User management (Admin only)
app.use("/api/users", require("./routes/users"));

// Campaigns (Create, Read, Update, Delete) 
app.use("/api/campaigns", require("./routes/campaigns"));

// ✅ FIXED: Banners API - changed from "/api/banner" to "/api/banners"
app.use("/api/banners", require("./routes/bannerRoutes"));

// ✅ FIXED: Notification Scrolls (banner scroll notifications) - SEPARATE PATH
// DO NOT use "/api/notifications" here - it's already used above!
app.use("/api/notification-scrolls", require("./routes/scrollRoutes"));

// ── Error handler ────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 PSG Alumni Backend running on port ${PORT}`);
  console.log(`📡 Available APIs:`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/health`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/banners/active`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/notification-scrolls/active`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/notifications (alumni notifications)`);
});