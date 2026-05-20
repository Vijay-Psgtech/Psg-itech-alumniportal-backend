const Event = require("../models/Events");

exports.getAllEvents = async (req, res) => {
  try {
    const { status, category } = req.query;
    let query = {};
    if (status) {
      query.status = { $regex: new RegExp(`^${status}$`, "i") };
    }
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    console.log("Query", query);
    const events = await Event.find(query).sort({ createdAt: -1 });

   res.json({
      success: true,
      data: events,
    });

  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
};


exports.getEventsById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    res.json({ success: true, data: event });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch events by Id" });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      date,
      time,
      venue,
      description,
      status,
      attendees,
      category,
      highlight,
    } = req.body;

    if (!title || !date || !venue) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const newEvent = new Event({
      title,
      date,
      time,
      venue,
      description,
      status: status || "upcoming",
      attendees: Number(attendees) || 0,
      category: category || "Other",
      highlight: highlight || false,
      tags: [category],
      longDescription: description,
      speakers: [],
      schedule: [],
      highlights: [],
    });

    if (req.file) {
      newEvent.imageUrl = req.file.path.replace(/\\/g, "/");
    }

    const savedEvent = await newEvent.save();
    res.status(201).json({ success: true, data: savedEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: "Failed to create event" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const {
      title,
      date,
      time,
      venue,
      description,
      status,
      attendees,
      category,
      highlight,
      tags,
      speakers,
      schedule,
      highlights,
    } = req.body;

    const updateData = {
      title,
      date,
      time,
      venue,
      description,
      status,
      attendees: Number(attendees) || 0,
      category,
      highlight,
      tags: tags || [category],
      longDescription: description,
      speakers: speakers || [],
      schedule: schedule || [],
      highlights: highlights || [],
      updatedAt: new Date(),
    };

    if (req.file) {
      updateData.imageUrl = req.file.path.replace(/\\/g, "/");
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (!updatedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, data: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ success: false, message: "Failed to update event" });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);

    if (!deletedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ success: false, message: "Failed to delete event" });
  }
};
