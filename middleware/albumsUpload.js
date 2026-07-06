const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Album = require("../models/Album");

// Albums multiple image upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const createFolder = (title) => {
      if (!title) {
        return cb(
          new Error("Missing album identifier for upload destination"),
        );
      }
      const folder = `uploads/albums/${title}/`;
      fs.mkdirSync(folder, { recursive: true });
      req.albumTitle = title;
      cb(null, folder);
    };
    if (req.body?.title) {
      return createFolder(req.body.title);
    }
    if (req.params?.id) {
      return Album.findOne({ id: req.params.id })
        .then((album) => {
          if (!album) {
            return cb(new Error("Album not found for upload destination"));
          }
          createFolder(album.title);
        })
        .catch(cb);
    }
    cb(new Error("Missing album identifier for upload destination"));
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
