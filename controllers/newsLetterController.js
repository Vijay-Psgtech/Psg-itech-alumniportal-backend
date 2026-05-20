const Newsletter = require("../models/Newsletter");

exports.getAllNewsLetters = async (req, res) => {
  try {
    const newsletters = await Newsletter.find().sort( { _id: -1 } );
    res.json({ success: true, data: newsletters });
  } catch (error) {
    console.error("Error fetching newsletters:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch newsletters" });
  }
};

exports.getNewsLetterById = async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) {
      return res
        .status(404)
        .json({ success: false, message: "Newsletter not found" });
    }
    res.json({ success: true, data: newsletter });
  } catch (error) {
    console.error("Error fetching newsletter by ID:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch newsletter by ID" });
  }
};

exports.createNewsLetter = async (req, res) => {
  try {
    const {
      title,
      date,
      category,
      description,
      tags,
      author,
    } = req.body;

    // Validation
    if (!title || !date || !description) {
      return res.status(400).json({
        success: false,
        message: "Title, date, and description are required",
      });
    }

    const newNewsletter = new Newsletter({
      title,
      date,
      category: category || "Newsletters",
      description,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      author,
    });

    // ✅ FIXED v2: Handle files from req.files array (from upload.any())
    // upload.any() returns all files in req.files as an array
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        console.log(`📁 File received: ${file.fieldname} - ${file.originalname}`);
        
        if (file.fieldname === "imageUrl" && file.mimetype.startsWith("image/")) {
          newNewsletter.imageUrl = file.path;
          console.log(`✅ Image saved: ${file.path}`);
        } else if (file.fieldname === "pdf" && file.mimetype === "application/pdf") {
          newNewsletter.pdfUrl = file.path;
          console.log(`✅ PDF saved: ${file.path}`);
        }
      });
    }
    
    const savedNewsletter = await newNewsletter.save();
    console.log("✅ Newsletter created:", savedNewsletter._id);
    
    res.status(201).json({ success: true, data: savedNewsletter });
  } catch (error) {
    console.error("Error creating newsletter:", error);
    res
      .status(500)
      .json({ 
        success: false, 
        message: "Failed to create newsletter",
        error: error.message 
      });
  }
};

exports.updateNewsLetter = async (req, res) => {
  try {
    const {
      title,
      date,
      category,
      description,
      tags,
      author,
    } = req.body;

    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) {
      return res
        .status(404)
        .json({ success: false, message: "Newsletter not found" });
    }

    // Update fields
    newsletter.title = title ?? newsletter.title;
    newsletter.date = date ?? newsletter.date;
    newsletter.category = category ?? newsletter.category;
    newsletter.description = description ?? newsletter.description;
    newsletter.tags = Array.isArray(tags) ? tags : (tags ? [tags] : newsletter.tags || []);
    newsletter.author = author ?? newsletter.author;
    newsletter.updatedAt = new Date();

    // ✅ FIXED v2: Handle files from req.files array
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        console.log(`📁 File received: ${file.fieldname} - ${file.originalname}`);
        
        if (file.fieldname === "imageUrl" && file.mimetype.startsWith("image/")) {
          newsletter.imageUrl = file.path;
          console.log(`✅ Image updated: ${file.path}`);
        } else if (file.fieldname === "pdf" && file.mimetype === "application/pdf") {
          newsletter.pdfUrl = file.path;
          console.log(`✅ PDF updated: ${file.path}`);
        }
      });
    }

    const updatedNewsletter = await newsletter.save();
    console.log("✅ Newsletter updated:", updatedNewsletter._id);
    
    res.json({ success: true, data: updatedNewsletter });
  } catch (error) {
    console.error("Error updating newsletter:", error);
    res
      .status(500)
      .json({ 
        success: false, 
        message: "Failed to update newsletter",
        error: error.message 
      });
  }
};

exports.deleteNewsLetter = async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) {
      return res
        .status(404)
        .json({ success: false, message: "Newsletter not found" });
    }

    await Newsletter.findByIdAndDelete(req.params.id);
    console.log("✅ Newsletter deleted:", req.params.id);
    
    res.json({ success: true, message: "Newsletter deleted successfully" });
  } catch (error) {
    console.error("Error deleting newsletter:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete newsletter" });
  }
};

exports.getNewsLettersByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const newsletters = await Newsletter.find({ category: category }).sort({
      date: -1,
    });
    res.json({ success: true, data: newsletters });
  } catch (error) {
    console.error("Error fetching newsletters by category:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch newsletters by category",
      });
  }
};