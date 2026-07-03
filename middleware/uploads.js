const multer = require("multer");
const path = require("path");
const fs = require("fs");

const getUploadFolder = (req) => {
  let folder = "uploads/";

  if (req.baseUrl.includes("event")) {
    folder += "events/";
  } else if (req.baseUrl.includes("alumni")) {
    folder += "alumniProfile/";
  } else if (req.baseUrl.includes("albums")) {
    folder += "albums/";
  } else if (req.baseUrl.includes("newsletters")) {
    folder += "newsletters/";
  } else {
    folder += "others/";
  }

  return folder;
};

const getUniqueFilename = (originalname) =>
  Date.now() + "-" + originalname.replace(/\s+/g, "-");

const storage = {
  _handleFile(req, file, cb) {
    const folder = getUploadFolder(req);
    fs.mkdirSync(folder, { recursive: true });

    const filename = getUniqueFilename(file.originalname);
    const fullPath = path.join(folder, filename);
    const outStream = fs.createWriteStream(fullPath);

    const maxFileSize =
      file.mimetype === "application/pdf"
        ? 100 * 1024 * 1024 // 100MB
        : 5 * 1024 * 1024; // 5MB

    let uploadedBytes = 0;
    let finished = false;

    const onError = (error) => {
      if (finished) return;
      finished = true;
      outStream.destroy();
      cb(error);
    };

    file.stream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      if (uploadedBytes > maxFileSize) {
        const err = new multer.MulterError("LIMIT_FILE_SIZE");
        err.message =
          file.mimetype === "application/pdf"
            ? "PDF file size must be under 100 MB"
            : "File size must be under 5 MB";

        file.stream.unpipe(outStream);
        file.stream.destroy(err);
        onError(err);
      }
    });

    outStream.on("error", onError);
    outStream.on("finish", () => {
      if (finished) return;
      finished = true;
      cb(null, {
        destination: folder,
        filename,
        path: fullPath,
        size: uploadedBytes,
      });
    });

    file.stream.pipe(outStream);
  },

  _removeFile(req, file, cb) {
    if (file.path) {
      fs.unlink(file.path, cb);
    } else {
      cb(new Error("File path is missing"));
    }
  },
};

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only PDF, JPG, JPEG, PNG and WEBP files are allowed"
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

module.exports = upload;