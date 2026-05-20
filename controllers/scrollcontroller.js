// ✅ FIXED: Import the renamed NotificationScroll model
const Notification = require("../models/scroll");

// Helper to parse booleans safely
const toBool = (v) => v === true || v === "true";

// ============ Get active notifications (public) ============
exports.getActiveNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("-__v -createdBy -metadata")
      .lean();

    res.status(200).json({
      success: true,
      data: notifications,
      total: notifications.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Get all notifications (admin) ============
exports.getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "-createdAt", type, isActive } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = toBool(isActive);

    const notifications = await Notification.find(filter)
      .sort(sort)
      .limit(Number(limit))
      .skip((page - 1) * limit)
      .lean();

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Get notification by ID ============
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id).lean();

    if (!notification) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Create notification ============
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, displayOrder, expiresAt } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message required" });
    }

    const notification = await Notification.create({
      title: title?.trim() || "",
      message: message.trim(),
      type: type || "info",
      displayOrder: displayOrder || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Update notification ============
exports.updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    Object.assign(notification, {
      ...req.body,
      title: req.body.title?.trim(),
      message: req.body.message?.trim(),
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    });

    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Delete notification ============
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Activate ============
exports.activateNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Deactivate ============
exports.deactivateNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Track view ============
exports.trackNotificationView = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $inc: { "metadata.viewCount": 1 },
    });

    res.status(200).json({ success: true, message: "View tracked" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ Track dismiss ============
exports.trackNotificationDismiss = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $inc: { "metadata.dismissCount": 1 },
    });

    res.status(200).json({ success: true, message: "Dismiss tracked" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};