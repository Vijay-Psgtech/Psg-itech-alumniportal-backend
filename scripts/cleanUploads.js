const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Event = require("../models/Events");
const Alumni = require("../models/Alumni");

// MongoDb connection
mongoose.connect("mongodb://localhost:27017/psgcas-alumni-portal");

async function cleanUploads() {
  try {
    const uploadsDir = path.join(__dirname, "../uploads");

    // ==============
    // Event Images
    // ===============
    const eventsFolder = path.join(uploadsDir, "events");

    const events = await Event.find({}, "imageUrl");

    const eventImages = events
      .map((e) => e.imageUrl)
      .filter(Boolean)
      .map((img) => path.basename(img));

    const eventFiles = fs.readdirSync(eventsFolder);

    let deletedEventFiles = [];

    for (const file of eventFiles) {
      if (!eventImages.includes(file)) {
        const filePath = path.join(eventsFolder, file);
        fs.unlinkSync(filePath);
        deletedEventFiles.push(file);
        console.log("Deleted event image:", file);
      }
    }

    // ==============
    // Alumni Profile Images
    // ===============

    const alumniFolder = path.join(uploadsDir, "alumniProfile");

    const alumni = await Alumni.find({}, "profileImage");

    const alumniImages = alumni
      .map((a) => a.profileImage)
      .filter(Boolean)
      .map((img) => path.basename(img));

    const alumniFiles = fs.readdirSync(alumniFolder);

    let deletedAlumniFiles = [];

    for (const file of alumniFiles) {
      if (!alumniImages.includes(file)) {
        const filePath = path.join(alumniFolder, file);
        fs.unlinkSync(filePath);
        deletedAlumniFiles.push(file);
        console.log("Deleted alumni image:", file);
      }
    }

    // ================================
    // SUMMARY
    // ================================

    console.log("\nCleanup Completed");
    console.log("Deleted Event Images:", deletedEventFiles.length);
    console.log("Deleted Alumni Images:", deletedAlumniFiles.length);

    process.exit();
  } catch (error) {
    console.error("CleanUp error:", error);
    process.exit(1);
  }
}

cleanUploads();
