const express = require("express");
const router = express.Router();
const {
  getAllAlumni,
  getAlumniById,
  updateAlumniProfile,
  getStats,
  getMapData,
  getAlumniBatchWise,
  getAlumniGroupedByBatch,
  batches,
  getAlumniStats,
  getAlumniFilters
} = require("../controllers/alumniController");
const { authMiddleware } = require("../middleware/auth");
const { alumniUpload } = require("../middleware/alumniUploads");

router.get("/", getAllAlumni);
router.get("/batch-wise", getAlumniBatchWise);
router.get("/batch-group", getAlumniGroupedByBatch);
router.get("/batches",batches);
router.get("/stats", getAlumniStats);
router.get("/map/data", getMapData);
router.get("/filters", getAlumniFilters);
router.get("/:id", getAlumniById);
router.put(
  "/:id",
  authMiddleware,
  alumniUpload,
  updateAlumniProfile,
);

module.exports = router;
