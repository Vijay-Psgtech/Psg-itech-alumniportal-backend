const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./config/db");

const app = express();

connectDB();

//--CORS---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5000",
  "http://localhost:5100",
  "http://localhost:5200",
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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

//--- Health Check API -------
app.get("/api/health", (_req, res) =>
  res.json({ message: "Server is running", status: "OK" }),
);

// ── Routes ───────────────────────────────────────────────────────
// ✅ NEW: DEPARTMENTS API (Dynamic departments management)
app.use("/api/departments", require("./routes/departments"));

// Chapters must be mounted before /api/alumni, otherwise /api/alumni/:id catches /api/alumni/chapters
app.use("/api/alumni/chapters", require("./routes/chapters"));

// Alumni directory (public + protected profile update)
app.use("/api/alumni", require("./routes/alumni"));

// ── NEW: EVENTS API (Create, Read, Update, Delete) ───────────────
app.use("/api/events", require("./routes/events"));

// ── NEW: ALBUMS API (Create, Read, Update, Delete) ───────────────
app.use("/api/albums", require("./routes/albums"));

// ── NEW: NEWSLETTERS API (Create, Read, Update, Delete) ───────────────
app.use("/api/newsletters", require("./routes/newsletters"));

// User management (Admin only)
app.use("/api/users", require("./routes/users"));


//--- Error Handler -------
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 PSG iTech Alumni Backend running on port ${PORT}`);
});
