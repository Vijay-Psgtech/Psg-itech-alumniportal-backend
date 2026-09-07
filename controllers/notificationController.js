// backend/controllers/notificationController.js
const Notification = require("../models/Notification");
const Alumni = require("../models/Alumni");
const path = require("path");

/* ─────────────────────────────────────────────────────────────────
   ALUMNI — create a new notification (goes to admin for approval)
───────────────────────────────────────────────────────────────── */
exports.createNotification = async (req, res) => {
  try {
    const { title, message, audienceType, targetBatch } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    if (!["all", "batch"].includes(audienceType)) {
      return res.status(400).json({ message: "Invalid audienceType" });
    }

    if (audienceType === "batch" && !targetBatch) {
      return res.status(400).json({ message: "targetBatch is required for batch notifications" });
    }

    const sender = await Alumni.findById(req.user.id).select("firstName lastName email");
    if (!sender) return res.status(404).json({ message: "Sender not found" });

    // Build attachment object if a file was uploaded
    let attachment = null;
    if (req.file) {
      attachment = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        path: req.file.path.replace(/\\/g, "/"),
        size: req.file.size,
      };
    }

    const notification = new Notification({
      senderId: req.user.id,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderEmail: sender.email,
      title,
      message,
      audienceType,
      targetBatch: audienceType === "batch" ? targetBatch : null,
      attachment,
      status: "pending",
    });

    await notification.save();

    res.status(201).json({
      message: "Notification submitted for admin approval",
      notification,
    });
  } catch (err) {
    console.error("createNotification error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────
   ALUMNI — get notifications visible to the logged-in alumni
   (only approved ones that match their batch OR audience=all)
───────────────────────────────────────────────────────────────── */
exports.getMyNotifications = async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.user.id).select("batchYear");
    if (!alumni) return res.status(404).json({ message: "Alumni not found" });

    const query = {
      status: "approved",
      $or: [
        { audienceType: "all" },
        { audienceType: "batch", targetBatch: alumni.batchYear },
      ],
    };

    const notifications = await Notification.find(query).sort({ approvedAt: -1 });

    res.json({
      message: "Notifications retrieved",
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("getMyNotifications error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────
   ALUMNI — get own submitted notifications (all statuses)
───────────────────────────────────────────────────────────────── */
exports.getMySubmissions = async (req, res) => {
  try {
    const notifications = await Notification.find({ senderId: req.user.id }).sort({ createdAt: -1 });
    res.json({ message: "Your submissions", count: notifications.length, notifications });
  } catch (err) {
    console.error("getMySubmissions error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────
   ADMIN — get all notifications (filterable by status)
───────────────────────────────────────────────────────────────── */
exports.adminGetAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.json({ message: "All notifications", count: notifications.length, notifications });
  } catch (err) {
    console.error("adminGetAll error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────
   ADMIN — approve a notification
───────────────────────────────────────────────────────────────── */
exports.adminApprove = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: req.user.id,
        adminNote: req.body.adminNote || "",
      },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Notification not found" });

    res.json({ message: "Notification approved", notification });
  } catch (err) {
    console.error("adminApprove error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────
   ADMIN — reject a notification
───────────────────────────────────────────────────────────────── */
exports.adminReject = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        adminNote: req.body.reason || "Rejected by admin",
        approvedBy: req.user.id,
      },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Notification not found" });

    res.json({ message: "Notification rejected", notification });
  } catch (err) {
    console.error("adminReject error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────
   ADMIN — delete a notification
───────────────────────────────────────────────────────────────── */
exports.adminDelete = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("adminDelete error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};