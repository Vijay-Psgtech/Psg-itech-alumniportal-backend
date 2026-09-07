const express = require("express");
const router = express.Router();
const {
  getAllEvents,
  getEventsById,
  createEvent,
  updateEvent,
  deleteEvent,
  getRecentEvents
} = require("../controllers/eventsController");
const upload = require("../middleware/uploads");
const adminAuth = require("../middleware/adminAuth");

router.get("/", getAllEvents);
router.get("/recent", getRecentEvents);
router.get("/:id", getEventsById);
router.post("/", adminAuth, upload.single("imageUrl"), createEvent);
router.put("/:id", adminAuth, upload.single("imageUrl"), updateEvent);
router.delete("/:id", adminAuth, deleteEvent);


module.exports = router;
