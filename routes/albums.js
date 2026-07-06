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

router.get("/", getAllAlbum);
router.get("/year/:year", getAlbumByYear);
router.post("/", upload.array("images", 20), createAlbum);
router.put("/:id", upload.array("images", 20), updateAlbum);
router.delete("/:id", deleteAlbum);

module.exports = router;
