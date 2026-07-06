const Counter = require("../models/Counter");

exports.generateAlumniId = async (req, res, next) => {
  try {
    // Find the counter document for alumniId
    const counter = await Counter.findOneAndUpdate(
      { name: "alumniId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }, // Create the document if it doesn't exist
    );
    const alumniId = `PSGiTech-ALUM-${counter.seq.toString().padStart(6, "0")}`;
    req.alumniId = alumniId; // Attach the generated alumniId to the request object
  } catch (error) {
    console.error("Error generating alumni ID:", error);
    throw error;
  }
};
