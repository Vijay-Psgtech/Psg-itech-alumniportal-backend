// backend/routes/notificationRoutes.js
const express = require("express");
const NotificationScroll = require("../models/scroll");
const { authMiddleware, superAdminMiddleware } = require("../middleware/auth");
const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// ✅ GET active notifications (PUBLIC - for banner display)
router.get("/active", async (req, res) => {
  try {
    const notifications = await NotificationScroll.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).sort({ displayOrder: 1, createdAt: -1 });

    res.json({ 
      success: true, 
      data: notifications 
    });
  } catch (error) {
    console.error("Error fetching active notifications:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch active notifications",
      error: error.message 
    });
  }
});

// ✅ TRACK NOTIFICATION VIEW (PUBLIC)
router.patch("/:id/view", async (req, res) => {
  try {
    const notification = await NotificationScroll.findByIdAndUpdate(
      req.params.id,
      { $inc: { "metadata.viewCount": 1 } },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error tracking view:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ TRACK NOTIFICATION DISMISS (PUBLIC)
router.patch("/:id/dismiss", async (req, res) => {
  try {
    const notification = await NotificationScroll.findByIdAndUpdate(
      req.params.id,
      { $inc: { "metadata.dismissCount": 1 } },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error tracking dismiss:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ADMIN ROUTES (Authentication + SuperAdmin required)
// ============================================

// ✅ GET all notifications (ADMIN ONLY)
router.get("/", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const notifications = await NotificationScroll.find().sort({
      displayOrder: 1,
      createdAt: -1,
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

// ✅ GET single notification (ADMIN ONLY)
router.get("/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const notification = await NotificationScroll.findById(req.params.id);

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ CREATE notification (ADMIN ONLY)
router.post("/", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { title, message, type, expiresAt } = req.body;

    // Validation
    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const notification = new NotificationScroll({
      title,
      message,
      type: type || "info",
      expiresAt: expiresAt || null,
      isActive: false, // Notifications start as inactive by default
      displayOrder: 0,
      createdBy: req.user._id || req.user.id,
    });

    await notification.save();
    res.status(201).json({ 
      success: true, 
      data: notification,
      message: "Notification created successfully"
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create notification",
      error: error.message 
    });
  }
});

// ✅ UPDATE notification (ADMIN ONLY)
router.put("/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, type, isActive, expiresAt, displayOrder } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Build update object
    const updateData = {
      title,
      message,
      type: type || "info",
      isActive: isActive === true, // Ensure boolean
      expiresAt: expiresAt || null,
      displayOrder: displayOrder || 0,
      updatedAt: new Date(),
    };

    // Find and update
    const updated = await NotificationScroll.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      data: updated,
      message: "Notification updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
});

// ✅ ACTIVATE notification (ADMIN ONLY)
router.patch(
  "/:id/activate",
  authMiddleware,
  superAdminMiddleware,
  async (req, res) => {
    try {
      const notification = await NotificationScroll.findByIdAndUpdate(
        req.params.id,
        { isActive: true, updatedAt: new Date() },
        { new: true },
      );

      if (!notification) {
        return res
          .status(404)
          .json({ success: false, message: "Notification not found" });
      }

      res.json({ 
        success: true, 
        data: notification,
        message: "Notification activated"
      });
    } catch (error) {
      console.error("Error activating notification:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// ✅ DEACTIVATE notification (ADMIN ONLY)
router.patch(
  "/:id/deactivate",
  authMiddleware,
  superAdminMiddleware,
  async (req, res) => {
    try {
      const notification = await NotificationScroll.findByIdAndUpdate(
        req.params.id,
        { isActive: false, updatedAt: new Date() },
        { new: true },
      );

      if (!notification) {
        return res
          .status(404)
          .json({ success: false, message: "Notification not found" });
      }

      res.json({ 
        success: true, 
        data: notification,
        message: "Notification deactivated"
      });
    } catch (error) {
      console.error("Error deactivating notification:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// ✅ TOGGLE active status (ADMIN ONLY - quick toggle endpoint)
router.patch(
  "/:id/toggle-active",
  authMiddleware,
  superAdminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const notification = await NotificationScroll.findById(id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      // Toggle the isActive status
      notification.isActive = !notification.isActive;
      notification.updatedAt = new Date();
      const updated = await notification.save();

      res.json({
        success: true,
        data: updated,
        message: `Notification ${updated.isActive ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Error toggling notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle notification",
        error: error.message,
      });
    }
  },
);

// ✅ DELETE notification (ADMIN ONLY)
router.delete(
  "/:id",
  authMiddleware,
  superAdminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await NotificationScroll.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      res.json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete notification",
        error: error.message,
      });
    }
  },
);

module.exports = router;