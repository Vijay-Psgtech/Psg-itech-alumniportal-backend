const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const dotenv       = require("dotenv");
const crypto       = require("crypto");
const path         = require("path");
const bodyParser   = require("body-parser");
const connectDB    = require("./config/db");

dotenv.config();

const app = express();
connectDB();

// ── Easebuzz Config (from .env) ───────────────────────────────────────────────
const easebuzzConfig = {
  key:           process.env.EASEBUZZ_KEY,
  salt:          process.env.EASEBUZZ_SALT,
  env:           process.env.EASEBUZZ_ENV  || "test",   // "test" or "prod"
  enable_iframe: process.env.EASEBUZZ_IFRAME || "0",
};

// ── CORS ──────────────────────────────────────────────────────────────────────
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
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true })); // needed for Easebuzz form posts
app.use(cookieParser());

// ── Static files ──────────────────────────────────────────────────────────────
app.use("/uploads", express.static("uploads"));
app.use("/static",  express.static(path.join(__dirname, "assets")));
app.use("/view",    express.static(path.join(__dirname, "views")));

// ── View engine (for Easebuzz response views if needed) ───────────────────────
app.engine("html", require("ejs").renderFile);
app.set("view engine", "ejs");

// ═════════════════════════════════════════════════════════════════════════════
//  EASEBUZZ PAYMENT GATEWAY ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// ── Helper: Reverse hash verification ────────────────────────────────────────
function verifyEasebuzzHash(response, salt) {
  const hashString = [
    salt,
    response.status,
    response.udf10 || "",
    response.udf9  || "",
    response.udf8  || "",
    response.udf7  || "",
    response.udf6  || "",
    response.udf5  || "",
    response.udf4  || "",
    response.udf3  || "",
    response.udf2  || "",
    response.udf1  || "",
    response.email,
    response.firstname,
    response.productinfo,
    response.amount,
    response.txnid,
    response.key,
  ].join("|");

  const calculatedHash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  return calculatedHash === response.hash;
}

// ── POST /api/payment/initiate ────────────────────────────────────────────────
// Initiates a new Easebuzz payment, returns access_key to redirect user
app.post("/api/payment/initiate", function (req, res) {
  const data = req.body;
  const initiate_payment = require("./initiate_payment.js");
  initiate_payment.initiate_payment(data, easebuzzConfig, res);
});

// ── POST /api/payment/response ────────────────────────────────────────────────
// Easebuzz redirects to this URL (surl/furl) after payment
// Verifies hash and processes the payment result
app.post("/api/payment/response", function (req, res) {
  const response = req.body;

  if (!verifyEasebuzzHash(response, easebuzzConfig.salt)) {
    console.error("❌ Easebuzz hash mismatch — possible tampering");
    return res.status(400).json({
      success: false,
      message: "Hash verification failed",
    });
  }

  if (response.status === "success") {
    console.log("✅ Payment successful:", response.txnid);
    // TODO: Update your database order/donation status here
    return res.status(200).json({
      success: true,
      message: "Payment successful",
      data: response,
    });
  } else {
    console.warn("⚠️ Payment failed/pending:", response.txnid, response.status);
    return res.status(200).json({
      success: false,
      message: "Payment failed or pending",
      data: response,
    });
  }
});

// ── POST /api/payment/webhook ─────────────────────────────────────────────────
// Easebuzz pushes payment events here automatically (configure in dashboard)
// Must be publicly accessible (not behind auth middleware)
app.post("/api/payment/webhook", function (req, res) {
  const payload = req.body;

  if (!verifyEasebuzzHash(payload, easebuzzConfig.salt)) {
    console.error("❌ Webhook hash mismatch — ignoring");
    return res.status(400).json({ success: false, message: "Hash mismatch" });
  }

  console.log("📩 Easebuzz webhook received:", payload.txnid, payload.status);

  // TODO: Update your DB based on payload.status
  // e.g. mark donation as paid, send confirmation email, etc.

  return res.status(200).json({ success: true, message: "Webhook received" });
});

// ── POST /api/payment/transaction ────────────────────────────────────────────
// Check status of a specific transaction by txnid
app.post("/api/payment/transaction", function (req, res) {
  const data = req.body;
  const transaction = require("./transaction.js");
  transaction.transaction(data, easebuzzConfig, res);
});

// ── POST /api/payment/transaction-by-date ────────────────────────────────────
// Fetch all transactions for a given date
app.post("/api/payment/transaction-by-date", function (req, res) {
  const data = req.body;
  const transaction_date = require("./tranaction_date.js");
  transaction_date.tranaction_date(data, easebuzzConfig, res);
});

// ── POST /api/payment/payout ──────────────────────────────────────────────────
// Fetch payout/settlement details for a given date
app.post("/api/payment/payout", function (req, res) {
  const data = req.body;
  const payout = require("./payout.js");
  payout.payout(data, easebuzzConfig, res);
});

// ── POST /api/payment/refund ──────────────────────────────────────────────────
// Initiate a refund for a transaction
app.post("/api/payment/refund", function (req, res) {
  const data = req.body;
  const refund = require("./refund.js");
  refund.refund(data, easebuzzConfig, res);
});

// ═════════════════════════════════════════════════════════════════════════════
//  PSG ALUMNI BACKEND ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ message: "Server is running", status: "OK" })
);

// Auth: register, login, forgot-password, verify-otp, reset-password, profile
app.use("/api/auth", require("./routes/auth"));

app.all("/api/dev/seed", async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const User = require("./models/Users");
    const Alumni = require("./models/Alumni");

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@psgitech.ac.in";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
    const alumniEmail = process.env.SEED_ALUMNI_EMAIL || "alumni@psgitech.ac.in";
    const alumniPassword = process.env.SEED_ALUMNI_PASSWORD || "Alumni@123";

    const existingAdmin = await User.findOne({ email: adminEmail });
    const existingAlumni = await Alumni.findOne({ email: alumniEmail });

    if (!existingAdmin) {
      await new User({
        firstName: "Seed",
        lastName: "Admin",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: "superadmin",
        department: "CSE",
      }).save();
    }

    if (!existingAlumni) {
      await new Alumni({
        alumniId: "SEED-ALUMNI-001",
        firstName: "Seed",
        lastName: "Alumni",
        email: alumniEmail,
        password: await bcrypt.hash(alumniPassword, 10),
        department: "CSE",
        batchYear: "2020",
        role: "Alumni",
        isApproved: true,
        location: {
          type: "Point",
          coordinates: [0, 0],
        },
      }).save();
    }

    res.json({
      success: true,
      message: "Seed users created",
      credentials: {
        admin: { email: adminEmail, password: adminPassword },
        alumni: { email: alumniEmail, password: alumniPassword },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ message: "Seed failed", error: error.message });
  }
});

// Departments (dynamic management)
app.use("/api/departments", require("./routes/departments"));

// Chapters — must be mounted BEFORE /api/alumni to avoid :id catching /chapters
app.use("/api/alumni/chapters", require("./routes/chapters"));

// Alumni directory (public + protected profile update)
app.use("/api/alumni", require("./routes/alumni"));

// Admin simple routes (approve/reject/stats)
app.use("/api/admin", require("./routes/admin"));

// Admin dashboard (full alumni mgmt + donations + stats)
app.use("/api/admin/dashboard", require("./routes/adminDash"));

// Events
app.use("/api/events", require("./routes/events"));

// Albums
app.use("/api/albums", require("./routes/albums"));

// Newsletters
app.use("/api/newsletters", require("./routes/newsletters"));

// Donations (public create + protected mine + admin all)
app.use("/api/donations", require("./routes/donation"));

// Notifications (alumni submission — admin approve/reject)
app.use("/api/notifications", require("./routes/notifications"));

// Reports (admin only)
app.use("/api/reports", require("./routes/adminReports"));

// User management (admin only)
app.use("/api/users", require("./routes/users"));

// Campaigns
app.use("/api/campaigns", require("./routes/campaigns"));

// Banners
app.use("/api/banners", require("./routes/bannerRoutes"));

// Notification scrolls (separate from /api/notifications)
app.use("/api/notification-scrolls", require("./routes/scrollRoutes"));

// ═════════════════════════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER
// ═════════════════════════════════════════════════════════════════════════════
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  START SERVER
// ═════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 PSG Alumni Backend running on port ${PORT}`);
  console.log(`📡 Available APIs:`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/health`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/banners/active`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/notification-scrolls/active`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/notifications`);
  console.log(`\n💳 Easebuzz Payment APIs:`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/payment/initiate`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/payment/response`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/payment/webhook`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/payment/transaction`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/payment/transaction-by-date`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/payment/payout`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/payment/refund`);
});
