// server/controllers/chapterController.js
// ✅ Chapters Controller - FIXED with safe populate + lean queries

const Chapter = require("../models/Chapter");
const Alumni = require("../models/Alumni");
const path = require("path");
const fs = require("fs").promises;

/* ─────────────────────────────────────────
   FILE UPLOAD HELPER
───────────────────────────────────────── */

const saveUploadedFile = async (file) => {
  if (!file) return null;

  const uploadsDir = path.join(__dirname, "../uploads/chapters");
  await fs.mkdir(uploadsDir, { recursive: true });

  // ✅ express-fileupload uses file.name and file.data (not originalname/buffer)
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const filepath = path.join(uploadsDir, filename);

  await fs.writeFile(filepath, file.data);
  return `chapters/${filename}`;
};

/* ─────────────────────────────────────────
   ALUMNI ENDPOINTS
───────────────────────────────────────── */

// Get all approved chapters
exports.getChapters = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    let query = { status: "approved" };

    if (category && category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ✅ lean() = plain JS objects, no crash on null refs
    // ✅ select("-members") = skip large members array, use memberCount
    // const chapters = await Chapter.find(query)
    //   .select("-members")
    //   .populate({
    //     path: "foundedBy",
    //     select: "firstName lastName profileImage",
    //   })
    //   .sort({ createdAt: -1 })
    //   .skip(skip)
    //   .limit(parseInt(limit))
    //   .lean();

    const chapters = await Chapter.find();

    const total = await Chapter.countDocuments(query);

    // Get user's chapter IDs (if authenticated)
    let userChapterIds = [];
    if (req.user) {
      const userChapters = await Chapter.find({
        status: "approved",
        members: req.user._id,
      }).select("_id").lean();
      userChapterIds = userChapters.map((ch) => ch._id.toString());
    }

    res.json({
      success: true,
      chapters,
      userChapterIds,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching chapters:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapters",
      error: error.message,
    });
  }
};

// Get chapter details
exports.getChapterById = async (req, res) => {
  try {
    const { id } = req.params;

    const chapter = await Chapter.findById(id)
      .populate("foundedBy", "firstName lastName profileImage email department graduationYear")
      .populate("members", "firstName lastName profileImage email department graduationYear")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    // ✅ Safe check — foundedBy may be null for dummy data
    if (chapter.status !== "approved") {
      const isOwner =
        chapter.foundedBy &&
        req.user &&
        chapter.foundedBy._id.toString() === req.user._id.toString();
      const isAdmin = req.user?.isAdmin;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    res.json({ success: true, chapter });
  } catch (error) {
    console.error("❌ Error fetching chapter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapter",
      error: error.message,
    });
  }
};

// Get chapters by category
exports.getChaptersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chapters = await Chapter.find({ status: "approved", category })
      .select("-members")
      .populate({ path: "foundedBy", select: "firstName lastName profileImage" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Chapter.countDocuments({ status: "approved", category });

    res.json({
      success: true,
      chapters,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching chapters by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapters",
      error: error.message,
    });
  }
};

// Get user's chapters (chapters they've joined)
exports.getMyChapters = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const chapters = await Chapter.find({
      status: "approved",
      members: req.user._id,
    })
      .populate({ path: "foundedBy", select: "firstName lastName profileImage" })
      .populate({ path: "members", select: "firstName lastName profileImage" })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, chapters });
  } catch (error) {
    console.error("❌ Error fetching user's chapters:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your chapters",
      error: error.message,
    });
  }
};

// Create chapter (pending approval)
exports.createChapter = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { title, description, content, location, category, tags } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const bannerImage = req.files?.bannerImage
      ? await saveUploadedFile(req.files.bannerImage)
      : null;

    const chapter = new Chapter({
      title,
      description,
      content: content || "",
      location: location || "",
      category: category || "regional",
      tags: tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [],
      bannerImage,
      foundedBy: req.user._id,
      members: [req.user._id],
      memberCount: 1,
      status: "pending",
    });

    await chapter.save();
    await chapter.populate("foundedBy", "firstName lastName profileImage");

    res.status(201).json({
      success: true,
      message: "Chapter created successfully! Awaiting admin approval.",
      chapter,
    });
  } catch (error) {
    console.error("❌ Error creating chapter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chapter",
      error: error.message,
    });
  }
};

// Update chapter (author only)
exports.updateChapter = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { id } = req.params;
    const { title, description, content, location, category, tags } = req.body;

    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    if (chapter.foundedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (title) chapter.title = title;
    if (description) chapter.description = description;
    if (content !== undefined) chapter.content = content;
    if (location) chapter.location = location;
    if (category) chapter.category = category;
    if (tags) chapter.tags = typeof tags === "string" ? JSON.parse(tags) : tags;

    if (req.files?.bannerImage) {
      const bannerImage = await saveUploadedFile(req.files.bannerImage);
      if (bannerImage) chapter.bannerImage = bannerImage;
    }

    await chapter.save();
    await chapter.populate("foundedBy", "firstName lastName profileImage");

    res.json({ success: true, message: "Chapter updated successfully!", chapter });
  } catch (error) {
    console.error("❌ Error updating chapter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update chapter",
      error: error.message,
    });
  }
};

// Delete chapter (author only)
exports.deleteChapter = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { id } = req.params;
    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    if (chapter.foundedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await Chapter.findByIdAndDelete(id);

    res.json({ success: true, message: "Chapter deleted successfully!" });
  } catch (error) {
    console.error("❌ Error deleting chapter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chapter",
      error: error.message,
    });
  }
};

// Join chapter
exports.joinChapter = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { id } = req.params;
    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    if (chapter.status !== "approved") {
      return res.status(403).json({ success: false, message: "Cannot join unapproved chapters" });
    }

    const isMember = chapter.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ success: false, message: "Already a member of this chapter" });
    }

    // ✅ Use findByIdAndUpdate to avoid pre-save hook
    const updated = await Chapter.findByIdAndUpdate(
      id,
      {
        $push: { members: req.user._id },
        $inc: { memberCount: 1 },
      },
      { new: true }
    );

    res.json({ success: true, message: "Joined chapter successfully!", chapter: updated });
  } catch (error) {
    console.error("❌ Error joining chapter:", error);
    res.status(500).json({ success: false, message: "Failed to join chapter", error: error.message });
  }
};

// Leave chapter
exports.leaveChapter = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { id } = req.params;
    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    const isMember = chapter.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({ success: false, message: "You are not a member of this chapter" });
    }

    // ✅ Use findByIdAndUpdate to avoid pre-save hook
    const updated = await Chapter.findByIdAndUpdate(
      id,
      {
        $pull: { members: req.user._id },
        $inc: { memberCount: -1 },
      },
      { new: true }
    );

    res.json({ success: true, message: "Left chapter successfully!", chapter: updated });
  } catch (error) {
    console.error("❌ Error leaving chapter:", error);
    res.status(500).json({ success: false, message: "Failed to leave chapter", error: error.message });
  }
};

// Get chapter members
exports.getChapterMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const chapter = await Chapter.findById(id)
      .populate(
        "members",
        "firstName lastName profileImage email department graduationYear"
      )
      .lean();

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    res.json({
      success: true,
      members: chapter.members || [],
      count: chapter.memberCount || 0,
    });
  } catch (error) {
    console.error("❌ Error fetching chapter members:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapter members",
      error: error.message,
    });
  }
};

/* ─────────────────────────────────────────
   ADMIN ENDPOINTS
───────────────────────────────────────── */

// Get all chapters with status (admin view)
exports.getAllChaptersAdmin = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { status, search, page = 1, limit = 10 } = req.query;

    let query = {};

    if (status && status !== "all") query.status = status;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chapters = await Chapter.find(query)
      .select("-members")
      .populate({ path: "foundedBy", select: "firstName lastName email profileImage" })
      .populate({ path: "approvedBy", select: "firstName lastName email" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Chapter.countDocuments(query);

    const grouped = {
      pending: await Chapter.countDocuments({ status: "pending" }),
      approved: await Chapter.countDocuments({ status: "approved" }),
      rejected: await Chapter.countDocuments({ status: "rejected" }),
    };

    res.json({
      success: true,
      chapters,
      grouped,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats: {
        total,
        ...grouped,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching chapters for admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapters",
      error: error.message,
    });
  }
};

// Get pending chapters (admin)
exports.getPendingChapters = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const chapters = await Chapter.find({ status: "pending" })
      .populate({ path: "foundedBy", select: "firstName lastName email profileImage department" })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, chapters });
  } catch (error) {
    console.error("❌ Error fetching pending chapters:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending chapters",
      error: error.message,            
    });
  }
};

// Get chapters by status (admin)
exports.getChaptersByStatus = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be pending, approved, or rejected",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chapters = await Chapter.find({ status })
      .populate({ path: "foundedBy", select: "firstName lastName email profileImage" })
      .populate({ path: "approvedBy", select: "firstName lastName email" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Chapter.countDocuments({ status });

    res.json({
      success: true,
      chapters,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching chapters by status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapters",
      error: error.message,
    });
  }
};

// Get chapter details (admin view)
exports.getChapterDetailsAdmin = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { id } = req.params;

    const chapter = await Chapter.findById(id)
      .populate("foundedBy", "firstName lastName email profileImage department graduationYear")
      .populate("members", "firstName lastName profileImage email department")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    res.json({ success: true, chapter });
  } catch (error) {
    console.error("❌ Error fetching chapter details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chapter",
      error: error.message,
    });
  }
};

// Approve chapter (admin)
exports.approveChapter = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { id } = req.params;
    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    if (chapter.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending chapters can be approved",
      });
    }

    chapter.status = "approved";
    chapter.approvedBy = req.user._id;
    chapter.approvedAt = Date.now();

    await chapter.save();

    res.json({ success: true, message: "Chapter approved successfully!", chapter });
  } catch (error) {
    console.error("❌ Error approving chapter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve chapter",
      error: error.message,
    });
  }
};

// Reject chapter (admin)
exports.rejectChapter = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    if (chapter.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending chapters can be rejected",
      });
    }

    chapter.status = "rejected";
    chapter.rejectionReason = reason;
    chapter.approvedBy = req.user._id;
    chapter.approvedAt = Date.now();

    await chapter.save();

    res.json({ success: true, message: "Chapter rejected successfully!", chapter });
  } catch (error) {
    console.error("❌ Error rejecting chapter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject chapter",
      error: error.message,
    });
  }
};

// Suspend chapter (admin)
exports.suspendChapter = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { id } = req.params;
    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    chapter.isSuspended = true;
    await chapter.save();

    res.json({ success: true, message: "Chapter suspended successfully!", chapter });
  } catch (error) {
    console.error("❌ Error suspending chapter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suspend chapter",
      error: error.message,
    });
  }
};

// Delete chapter as admin (force delete)
exports.deleteChapterAsAdmin = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { id } = req.params;
    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    await Chapter.findByIdAndDelete(id);

    res.json({ success: true, message: "Chapter deleted by admin successfully!" });
  } catch (error) {
    console.error("❌ Error deleting chapter as admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chapter",
      error: error.message,
    });
  }
};