const Album = require("../models/Album");
const fs = require("fs");

exports.getAllAlbum = async (req, res) => {
  try {
    const albums = await Album.find().sort({ createdAt: -1 });

    const albumsData = albums.map(album => ({
      id: album.id,
      year: album.year,
      title: album.title,
      event: album.event,
      date: album.date,
      photos: album.photos,
      accent: album.accent,
      tags: album.tags,
      images: album.images,
      coverImage: album.images && album.images.length > 0 ? album.images[0] : null,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    }));


    res.json({ success: true, data: albumsData });

  } catch(error) {
    console.error("Error fetching albums:", error);
    res.status(500).json({ success: false, message: "Failed to fetch albums" });
  }
}

// ── GET albums for a specific year ──────────────────────────────────
exports.getAlbumByYear = async (req, res) => {
  try {
    const year = Number(req.params.year);
    const albums = await Album.find({ year }).sort({ date: -1 });

    const yearData = {
      year,
      coverColor: "#667eea",
      totalPhotos: albums.reduce((s, a) => s + a.photos, 0),
      totalEvents: albums.length,
      albums,
    };

    res.json({ success: true, data: yearData });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch year albums" });
  }
};

// ── CREATE new album ────────────────────────────────────────────────
exports.createAlbum = async (req, res) => {
  console.log("Body", req.body);
  try {
    let { year, title, event, date, photos, accent, tags } = req.body;

    // Extract year from date if not provided
    if (!year && date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        year = parsedDate.getFullYear();
      }
    }

    if (!year || !title || !event) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const newAlbum = new Album({
      year: Number(year),
      id: `album-${Date.now()}`,
      title,
      event,
      date,
      photos: Number(photos) || 0,
      accent: accent || "#b8882a",
      tags: tags || [event],
    });

    // Handle file uploads if needed (multiple images)
    if (req.files && req.files.length > 0) {
      newAlbum.images = req.files.map((file) => file.path);
    }

    const savedAlbum = await newAlbum.save();
    res.status(201).json({ success: true, data: savedAlbum });
  } catch (error) {
    console.error("Error creating album:", error);
    res.status(500).json({ success: false, message: "Failed to create album" });
  }
};

// ── UPDATE album ────────────────────────────────────────────────────
exports.updateAlbum = async (req, res) => {
  try {
    const { title, event, date, photos, accent, tags } = req.body;

    const album = await Album.findOne({ id: req.params.id });
    if (!album) {
      return res
        .status(404)
        .json({ success: false, message: "Album not found" });
    }

    album.title = title ?? album.title;
    album.event = event ?? album.event;
    album.date = date ?? album.date;
    album.photos = Number(photos) || album.photos;
    album.accent = accent ?? album.accent;
    album.tags = tags ?? album.tags;
    album.updatedAt = new Date();

    if (req.files && req.files.length > 0) {
      album.images.push(...req.files.map((file) => file.path));
    }

    const updatedAlbum = await album.save();
    res.json({ success: true, data: updatedAlbum });
  } catch (error) {
    console.error("Error updating album:", error);
    res.status(500).json({ success: false, message: "Failed to update album" });
  }
};

// ── DELETE album ────────────────────────────────────────────────────
exports.deleteAlbum = async (req, res) => {
  try {
    const deletedAlbum = await Album.findOneAndDelete({ id: req.params.id });

    // Delete associated images from filesystem if needed
    if (deletedAlbum && deletedAlbum.images) {
      deletedAlbum.images.forEach((imagePath) => {
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error("Error deleting image file:", err);
          }
        });
      });
    }

    if (!deletedAlbum) {
      return res
        .status(404)
        .json({ success: false, message: "Album not found" });
    }

    res.json({ success: true, message: "Album deleted successfully" });
  } catch (error) {
    console.error("Error deleting album:", error);
    res.status(500).json({ success: false, message: "Failed to delete album" });
  }
};
