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

    const allAlumni = await Alumni.aggregate([
      { $match: { role: "Alumni", batchYear: { $exists: true } } },
      { $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        batchYear: 1,
        department: 1,
        files: 1,
        createdAt: 1,
      }},
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
    ])

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

// Get alumni details with department grouping
exports.getAlumniDeptWise = async (req, res) => {
  try{

    const {
      batchYear,
      department,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    let query = { role: "Alumni" };

    // Batch filter
    if (batchYear) {
      query.batchYear = batchYear === "null" ? null : batchYear;
    }

    // Department filter
    if (department) {
      query.department = department;
    }

    // Search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { currentCompany: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const alumni = await Alumni.aggregate([
      { $match: query },
      {
        $project: {
          alumniId: 1,
          firstName: 1,
          lastName: 1,
          rollNumber: 1,
          department: 1,
          degree: 1,
          batchYear: 1,
          currentCompany: 1,
          jobTitle: 1,
          files: 1,
          isApproved: 1,
          membershipStatus: 1,
        },
      },
      {
        $group: {
          _id: "$department",
          alumni: { $push: "$$ROOT" },
        },
      },
      { $sort: { department: 1 } },
      { $skip: skip },
      { $limit: Number(limit) },

    ]);
    res.status(200).json({
      success: true,
      data: alumni,
    });
  } catch(error) {
    console.error("Error fetching alumni data by department:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Get Alumni details with batchYear grouping
exports.getAlumniBatchWise = async (req, res) => {
  try{

    const {
      batchYear,
      department,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    let query = { role: "Alumni" };

    // Batch filter
    if (batchYear) {
      query.batchYear = batchYear === "null" ? null : batchYear;
    }

    // Department filter
    if (department) {
      query.department = department;
    }

    // Search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { currentCompany: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const alumni = await Alumni.aggregate([
      { $match: query },
      {
        $project: {
          alumniId: 1,
          firstName: 1,
          lastName: 1,
          rollNumber: 1,
          department: 1,
          degree: 1,
          batchYear: 1,
          currentCompany: 1,
          jobTitle: 1,
          files: 1,
          isApproved: 1,
          membershipStatus: 1,
        },
      },
      {
        $group: {
          _id: "$batchYear",
          alumni: { $push: "$$ROOT" },
        },
      },
      { $sort: { batchYear: 1 } },
      { $skip: skip },
      { $limit: Number(limit) },

    ]);
    res.status(200).json({
      success: true,
      data: alumni,
    });
  } catch(error) {
    console.error("Error fetching alumni data by batchYear:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
