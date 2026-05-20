const Banner = require("../models/Banner");
const fs = require("fs").promises;
const path = require("path");

exports.getActiveBanner = async (req, res) => {
  try {
    const banner = await Banner.findOne({ isActive: true }).select("-createdBy -__v");

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "No active banner found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBanners = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "-createdAt" } = req.query;
    const skip = (page - 1) * limit;

    const banners = await Banner.find()
      .select("-__v")
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);

    const total = await Banner.countDocuments();

    res.status(200).json({
      success: true,
      data: banners,
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

exports.getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id).select("-__v");

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const { title, description, subtitle, backgroundImage, features, primaryButtonText, secondaryButtonText } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and description required" });
    }

    const banner = await Banner.create({
      title: title.trim(),
      description: description.trim(),
      subtitle: subtitle || "",
      backgroundImage: backgroundImage || "",
      features: features || [],
      primaryButtonText: primaryButtonText || "Join Now",
      secondaryButtonText: secondaryButtonText || "Learn More",
      createdBy: req.user?._id,
      isActive: !!req.body.isActive,
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    Object.assign(banner, req.body);
    await banner.save();

    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    if (banner.backgroundImage?.startsWith("/uploads")) {
      const filePath = path.join(__dirname, "..", "..", banner.backgroundImage);
      await fs.unlink(filePath).catch(() => {});
    }

    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setActiveBanner = async (req, res) => {
  try {
    await Banner.updateMany({}, { isActive: false });

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const imageUrl = `/uploads/banners/${req.file.filename}`;

    res.status(200).json({
      success: true,
      data: {
        imageUrl,
        filename: req.file.filename,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};