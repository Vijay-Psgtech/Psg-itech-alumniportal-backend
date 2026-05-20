// backend/controllers/alumniController.js
const Alumni = require("../models/Alumni");

// @route   GET /api/alumni
// @desc    Get all approved alumni
// @access  Public
exports.getAllAlumni = async (req, res) => {
  try {
    const { department, batchYear, country, city, search } = req.query;
    const totalCount = await Alumni.countDocuments();
    // Build filter
    let filter = { role: "Alumni" };

    if (department) filter.department = department;
    if (batchYear) filter.batchYear = batchYear === "null" ? null : batchYear;
    if (country) filter.country = country;
    if (city) filter.city = city;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { currentCompany: { $regex: search, $options: "i" } },
      ];
    }

    const alumni = await Alumni.find(filter).select("-password");

    res.json({
      message: "Alumni retrieved successfully",
      count: totalCount,
      alumni,
    });
  } catch (error) {
    console.error("Get All Alumni Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route   GET /api/alumni/:id
// @desc    Get alumni by ID
// @access  Public
exports.getAlumniById = async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id).select("-password");

    if (!alumni || !alumni.isApproved) {
      return res.status(404).json({ message: "Alumni not found" });
    }

    res.json({
      message: "Alumni retrieved successfully",
      alumni,
    });
  } catch (error) {
    console.error("Get Alumni By ID Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route   PUT /api/alumni/:id
// @desc    Update alumni profile
// @access  Private
exports.updateAlumniProfile = async (req, res) => {
  try {
    // ── Authorization ──────────────────────────────────────────────────────
    if (req.user.id !== req.params.id && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    const allowedFields = [
      "firstName",
      "lastName",
      "phone",
      "gender",
      "occupation",

      "rollNumber",
      "department",
      "programmeType",
      "degree",
      "batchYear",
      "studyStartYear",
      "studyEndYear",

      "currentCompany",
      "jobTitle",
      "industry",
      "officeContact",

      "country",
      "city",
      "fullAddress",
    ];

    const updateData = {};

    allowedFields.forEach((key) => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    // ── 2. Nested: social links ────────────────────────────────────────────
    // Frontend sends either a JSON string or dot-notation keys like "social.linkedin"
    const socialFields = [
      "linkedin",
      "twitter",
      "instagram",
      "facebook",
      "website",
    ];
    const socialUpdate = {};

    if (req.body.social) {
      // Sent as a serialized JSON string e.g. FormData.append("social", JSON.stringify({...}))
      try {
        const parsed =
          typeof req.body.social === "string"
            ? JSON.parse(req.body.social)
            : req.body.social;
        socialFields.forEach((key) => {
          if (parsed[key] !== undefined) socialUpdate[key] = parsed[key];
        });
      } catch (_) {
        // malformed JSON — skip silently
      }
    } else {
      // Sent as dot-notation keys e.g. "social.linkedin"
      socialFields.forEach((key) => {
        const dotKey = `social.${key}`;
        if (req.body[dotKey] !== undefined)
          socialUpdate[key] = req.body[dotKey];
      });
    }

    if (Object.keys(socialUpdate).length > 0) {
      // Merge into existing social sub-document (don't wipe keys not sent)
      socialFields.forEach((key) => {
        if (socialUpdate[key] !== undefined) {
          updateData[`social.${key}`] = socialUpdate[key];
        }
      });
    }

    // ── 3. Nested: office address ──────────────────────────────────────────
    const officeAddressFields = [
      "line1",
      "line2",
      "city",
      "state",
      "pincode",
      "country",
    ];
    const officeUpdate = {};

    if (req.body.officeAddress) {
      try {
        const parsed =
          typeof req.body.officeAddress === "string"
            ? JSON.parse(req.body.officeAddress)
            : req.body.officeAddress;
        officeAddressFields.forEach((key) => {
          if (parsed[key] !== undefined) officeUpdate[key] = parsed[key];
        });
      } catch (_) {
        // malformed JSON — skip silently
      }
    } else {
      officeAddressFields.forEach((key) => {
        const dotKey = `officeAddress.${key}`;
        if (req.body[dotKey] !== undefined)
          officeUpdate[key] = req.body[dotKey];
      });
    }

    if (Object.keys(officeUpdate).length > 0) {
      officeAddressFields.forEach((key) => {
        if (officeUpdate[key] !== undefined) {
          updateData[`officeAddress.${key}`] = officeUpdate[key];
        }
      });
    }

    // ── 4. Geo coordinates → location GeoJSON ─────────────────────────────
    if (req.body.coordinates) {
      let coords = req.body.coordinates;
      // multer / express may give an array or a comma-separated string
      if (typeof coords === "string") {
        coords = coords.split(",").map(Number);
      } else if (Array.isArray(coords)) {
        coords = coords.map(Number);
      }
      if (coords.length === 2 && coords.every((n) => !isNaN(n))) {
        updateData.location = { type: "Point", coordinates: coords };
      }
    }

    // ── 5. Profile photo (single, field name: "profileImage") ─────────────
    if (
      req.files &&
      req.files.profileImage &&
      req.files.profileImage.length > 0
    ) {
      updateData.profileImage = req.files.profileImage[0].path.replace(
        /\\/g,
        "/",
      );
    }

    // ── 6. Document files (multiple, each under its own field name) ────────
    // Expects multer fields: studentPhoto, currentPhoto, idCard,
    //                        businessCard, entrepreneurPoster
    const documentFields = [
      "studentPhoto",
      "currentPhoto",
      "idCard",
      "businessCard",
      "entrepreneurPoster",
    ];

    if (req.files) {
      const alumniFolderId = req.alumniId;
      documentFields.forEach((field) => {
        const uploaded = req.files[field];
        if (uploaded && uploaded.length > 0) {
          const filename = uploaded[0].filename;
          updateData[`files.${field}`] = alumniFolderId
            ? `alumni/${alumniFolderId}/${filename}`
            : uploaded[0].path.replace(/\\/g, "/");
        }
      });
    }

    // ── 7. Persist ─────────────────────────────────────────────────────────
    const alumni = await Alumni.findByIdAndUpdate(
      req.params.id,
      { $set: updateData }, // $set so dot-notation merges nested fields safely
      { new: true, runValidators: true },
    ).select("-password");

    if (!alumni) {
      return res.status(404).json({ message: "Alumni not found" });
    }

    res.json({ message: "Profile updated successfully", alumni });
  } catch (error) {
    console.error("Update Alumni Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route   GET /api/alumni/map/data
// @desc    Get alumni data for map visualization
// @access  Public
exports.getMapData = async (req, res) => {
  try {
    const { department } = req.query;
    let filter = { role: "Alumni" };

    if (department) filter.department = department;

    const alumni = await Alumni.find({
      ...filter,
      country: { $exists: true, $ne: "" },
      city: { $exists: true, $ne: "" },
    })
      .select("-password")
      .lean();

    // Group by country
    const groupedByCountry = {};
    alumni.forEach((a) => {
      if (!groupedByCountry[a.country]) {
        groupedByCountry[a.country] = [];
      }
      groupedByCountry[a.country].push(a);
    });

    // Group by city within each country
    Object.keys(groupedByCountry).forEach((country) => {
      const cityGroups = {};
      groupedByCountry[country].forEach((a) => {
        if (!cityGroups[a.city]) {
          cityGroups[a.city] = [];
        }
        cityGroups[a.city].push(a);
      });
      groupedByCountry[country] = cityGroups;
    });

    res.json({
      message: "Map data retrieved successfully",
      data: {
        alumni,
        groupedByCountry,
        stats: {
          totalAlumni: alumni.length,
          countriesRepresented: Object.keys(groupedByCountry).length,
          citiesRepresented: Object.keys(groupedByCountry).reduce(
            (acc, country) =>
              acc + Object.keys(groupedByCountry[country]).length,
            0,
          ),
        },
      },
    });
  } catch (error) {
    console.error("Get Map Data Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get /api/alumni/alumni-batchYear
// Alumni batchwise
exports.getAlumniBatchWise = async (req, res) => {
  try {
    const {
      batchYear,
      department,
      occupation,
      search,
      page = 1,
      limit = 12,
      sort = "desc",
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

    // Occupation filter
    if (occupation) {
      query.occupation = occupation;
    }

    // Search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { currentCompany: { $regex: search, $options: "i" } },
        { jobTitle: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const alumni = await Alumni.find(query)
      .sort({ batchYear: sort === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("-password");

    const total = await Alumni.countDocuments(query);

    res.status(200).json({
      success: true,
      count: alumni.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      alumni,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch alumni",
      error: error.message,
    });
  }
};

exports.getAlumniGroupedByBatch = async (req, res) => {
  try {
    const alumni = await Alumni.aggregate([
      {
        $group: {
          _id: "$batchYear",
          alumni: { $push: "$$ROOT" },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: alumni,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch alumni",
      error: error.message,
    });
  }
};

exports.batches = async (req, res) => {
  try {
    const { department } = req.query;

    let filter = {
      role: "Alumni"
    };

    if (department) {
      filter.department = department;
    }

    // Fetch valid batch years only
    const batches = await Alumni.distinct("batchYear", {
      ...filter,
    });

    // fetch field missing / null / empty as "Unknown" batch with count and departments represented in that batch
    const unknownBatchCount = await Alumni.countDocuments({
      ...filter,
      $or: [
        { batchYear: null },
        { batchYear: "" },
        { batchYear: { $exists: false } },
      ],
    });

    const batchesWithCounts = await Alumni.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            $cond: [
              {
                $or: [
                  { $eq: ["$batchYear", null] },
                  { $eq: ["$batchYear", ""] },
                  { $not: ["$batchYear"] }, // field missing
                ],
              },
              "Unknown",
              "$batchYear",
            ],
          },
          count: { $sum: 1 },
          departments: { $addToSet: "$department" },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    // Merge "Unknown" into batches array if there are records with missing batchYear
    if (unknownBatchCount > 0) {
      batches.push("Unknown");
    }

    res.status(200).json({
      batches: batches.sort((a, b) => b - a),
      batchesWithCounts,
      unknownBatchCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch batch data",
      error: error.message,
    });
  }
};

// Get alumni totalcount, batchwise count, departmentwise count, etc. for stats page
exports.getAlumniStats = async (req, res) => {
  try {
    const { department } = req.query;
    let filter = { role: "Alumni" };
    if (department) filter.department = department;
    const totalAlumni = await Alumni.countDocuments({
            ...filter,
    });
    const batchStats = await Alumni.aggregate([
      { $match: { ...filter } },
      {
        $group: {
          _id: "$batchYear",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const departmentStats = await Alumni.aggregate([
      { $match: { ...filter } },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const countryStats = await Alumni.aggregate([
      { $match: { ...filter } },
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const topCities = await Alumni.aggregate([
      { $match: { city: { $exists: true }, ...filter } },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        totalAlumni,
        batchStats: batchStats.length,
        departmentStats: departmentStats.length,
        countryStats: countryStats.length,
        topCities: topCities.length,
      },
    });
  } catch (error) {
    console.error("Get Alumni Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// fetching distinct department & batch from alumni modal

exports.getDistinctDeptandBatch = async (req, res) => {
  try {
    const departments = await Alumni.distinct("department").sort();
    const batches = await Alumni.distinct("batchYear").sort();

    res.json({
      success: true,
      data: {
        departments,
        batches
      }
    });
  } catch (err) {
    console.error("Get Disinct Deaprtment & batch Error:", err);
    res.status(500).json({message: "Server error", err: err.message });
  }
}
