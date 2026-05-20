// backend/routes/bannerRoutes.js
const express = require("express");
const Banner = require("../models/Banner");
const { authMiddleware, superAdminMiddleware } = require("../middleware/auth");
const router = express.Router();

// ✅ GET active banner (PUBLIC - no auth needed)
router.get("/active", async (req, res) => {
  try {
    const banner = await Banner.findOne({ isActive: true });
    
    if (!banner) {
      return res.json({
        success: true,
        data: {
          title: "Connect, Grow & Lead Together",
          subtitle: "Welcome to Excellence",
          description: "Join our alumni community",
          backgroundImage: "https://via.placeholder.com/1600x900",
          features: [
            { icon: "Users", text: "12K+ Alumni" },
            { icon: "Globe", text: "35+ Countries" },
            { icon: "Sparkles", text: "200+ Events" }
          ],
          primaryButtonText: "Join Now",
          secondaryButtonText: "Learn More",
          isActive: true
        }
      });
    }

    res.json({ success: true, data: banner });
  } catch (error) {
    console.error("Error fetching active banner:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET all banners (ADMIN ONLY)
router.get("/", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ CREATE banner (ADMIN ONLY)
router.post("/", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { title, subtitle, description, backgroundImage, features, primaryButtonText, secondaryButtonText } = req.body;

    if (!title || !description || !backgroundImage) {
      return res.status(400).json({ 
        success: false,
        message: "Title, description, and backgroundImage required" 
      });
    }

    const banner = new Banner({
      title,
      subtitle,
      description,
      backgroundImage,
      features: features || [],
      primaryButtonText,
      secondaryButtonText,
      isActive: false,
      createdBy: req.user.id
    });

    await banner.save();
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    console.error("Error creating banner:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ UPDATE banner (ADMIN ONLY)
router.put("/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.json({ success: true, data: banner });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ DELETE banner (ADMIN ONLY)
router.delete("/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.json({ success: true, message: "Banner deleted successfully" });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ SET banner as active (ADMIN ONLY)
router.patch("/:id/set-active", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    await Banner.updateMany({}, { isActive: false });
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { isActive: true, updatedAt: Date.now() },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.json({ success: true, data: banner });
  } catch (error) {
    console.error("Error setting banner active:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;