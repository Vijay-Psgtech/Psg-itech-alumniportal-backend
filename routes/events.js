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

router.get("/", getAllEvents);
router.get("/recent", getRecentEvents);
router.get("/:id", getEventsById);
router.post("/", upload.single("imageUrl"), createEvent);
router.put("/:id", upload.single("imageUrl"), updateEvent);
router.delete("/:id", deleteEvent);


module.exports = router;
