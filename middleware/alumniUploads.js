const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Alumni = require("../models/Alumni");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const createFolder = (alumniId) => {
      if (!alumniId) {
        return cb(new Error("Missing alumni identifier for upload destination"));
      }
      const folder = `uploads/alumni/${alumniId}/`;
      fs.mkdirSync(folder, { recursive: true });
      req.alumniId = alumniId;
      cb(null, folder);
    };

    if (req.alumniId) {
      return createFolder(req.alumniId);
    }

    if (req.params?.id) {
      return Alumni.findById(req.params.id)
        .then((alumni) => {
          if (!alumni) {
            return cb(new Error("Alumni not found for upload destination"));
          }
          createFolder(alumni.alumniId);
        })
        .catch(cb);
    }

    cb(new Error("Missing alumni identifier for upload destination"));

  },

  filename: function (req, file, cb) {
    let fileName = "";

    if (file.fieldname === "businessCard") {
      fileName = "business-card";
    } else if (file.fieldname === "idCard") {
      fileName = "id-card";
    } else if (file.fieldname === "entrepreneurPoster") {
      fileName = "entrepreneur-poster";
    } else if (file.fieldname === "studentPhoto") {
      fileName = "student-photo";
    } else if (file.fieldname === "currentPhoto") {
      fileName = "current-photo";
    } else if (file.fieldname === "profileImage") {
      fileName = "profile-image";
    } else {
      return cb(new Error("Unexpected file field: " + file.fieldname));
    }

    const ext = path.extname(file.originalname);

    cb(null, `${fileName}${ext}`);

  },
});

const upload = multer({ storage });

const alumniUpload = upload.fields([
  { name: "businessCard", maxCount: 1 },
  { name: "idCard", maxCount: 1 },
  { name: "entrepreneurPoster", maxCount: 1 },
  { name: "studentPhoto", maxCount: 1 },
  { name: "currentPhoto", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },
]);

module.exports = { alumniUpload };
