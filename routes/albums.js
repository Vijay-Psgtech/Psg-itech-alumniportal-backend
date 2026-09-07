const express = require("express");
const router = express.Router();
const {
  getAllAlbum,
  getAlbumByYear,
  createAlbum,
  updateAlbum,
  deleteAlbum,
} = require("../controllers/albumController");
const upload = require("../middleware/albumsUpload");
const adminAuth = require("../middleware/adminAuth");

router.get("/", getAllAlbum);
router.get("/year/:year", getAlbumByYear);
router.post("/", adminAuth, upload.array("images", 20), createAlbum);
router.put("/:id", adminAuth, upload.array("images", 20), updateAlbum);
router.delete("/:id", adminAuth, deleteAlbum);

module.exports = router;
