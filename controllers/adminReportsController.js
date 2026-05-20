const Alumni = require("../models/Alumni");
const Event = require("../models/Events");

exports.getAlumniByYear = async (req, res) => {
  try {
    const totalCount = await Alumni.countDocuments({ role: "Alumni", batchYear: { $exists: true } });
    const countByYear = await Alumni.aggregate([
      { $match: { role: "Alumni", batchYear: { $exists: true } }},
      {
        $project: {
          year: "$batchYear",
        },
      },
      {
        $group: {
          _id: "$year",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id",
          count: 1,
        },
      },
      { $sort: { year: 1 } },
    ]);

    const allAlumni = await Alumni.find({ role: "Alumni", batchYear: { $exists: true } }).sort({ createdAt: -1 }).limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalCount,
        countByYear,
        allAlumni,
      },
    });
  } catch (error) {
    console.error("Error fetching alumni count by year:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// get Alumni count by department
exports.getAlumniByDepartment = async (req, res) => {
  try {
    const countByDepartment = await Alumni.aggregate([
      { $match: { role: "Alumni", batchYear: { $exists: true } } },
      {
        $project: {
          department: "$department",
        },
      },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
        },
      },
      { 
        $project: {
          _id: 0,
          department: "$_id",
          count: 1,
        },
      },
      { $sort: { department: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        countByDepartment,
      },
    });
  } catch (error) {
    console.error("Error fetching alumni count by department:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
