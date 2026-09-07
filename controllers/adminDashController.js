const Alumni = require("../models/Alumni");
const Donation = require("../models/Donation");
const Event = require("../models/Events");
const Album = require("../models/Album");

// GET /api/admin/dashboard/alumni/all
exports.getAllAlumniForAdmin = async (req, res) => {
  try {
    const {
      status,
      search,
      department,
      batchYear,
      sortBy,
      page = 1,
      limit = 20,
    } = req.query;

    let filter = { role: "Alumni" };
    if (status === "pending") filter.isApproved = false;
    else if (status === "approved") filter.isApproved = true;
    if (department) filter.department = department;
    if (batchYear) filter.batchYear = batchYear === "null" ? null : batchYear;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { jobTitle: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === "name") sortOptions = { firstName: 1, lastName: 1 };
    else if (sortBy === "email") sortOptions = { email: 1 };
    else if (sortBy === "year") sortOptions = { batchYear: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const alumni = await Alumni.find(filter)
      .select("-password")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalAlumni = await Alumni.countDocuments(filter);
    const totalApproved = await Alumni.countDocuments({
      ...filter,
      isApproved: true,
    });
    const totalPending = await Alumni.countDocuments({
      ...filter,
      isApproved: false,
    });

    res.json({
      message: "Alumni retrieved successfully",
      count: alumni.length,
      alumni,
      totalAlumni,
      totalApproved,
      totalPending,
      currentPage: parseInt(page),
      totalPages: Math.ceil(
        (await Alumni.countDocuments(filter)) / parseInt(limit),
      ),
    });
  } catch (error) {
    console.error("Get All Alumni Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/admin/dashboard/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalAlumni,
      approvedAlumni,
      pendingAlumni,
      completedDonations,
      pendingDonations,
      totalEvents,
      albumsCount,
    ] = await Promise.all([
      Alumni.countDocuments({ role: "Alumni" }),
      Alumni.countDocuments({ isApproved: true, role: "Alumni" }),
      Alumni.countDocuments({ isApproved: false, role: "Alumni" }),
      Donation.find({ status: "completed" }),
      Donation.countDocuments({ status: "pending" }),
      Event.countDocuments(),
      Album.countDocuments(),
    ]);

    res.json({
      message: "Dashboard statistics retrieved successfully",
      stats: {
        totalAlumni: totalAlumni || 0,
        approvedAlumni: approvedAlumni || 0,
        pendingAlumni: pendingAlumni || 0,
        completedDonations: completedDonations.length || 0,
        totalDonatedAmount: completedDonations.reduce(
          (sum, d) => sum + d.amount,
          0,
        ),
        pendingDonations: pendingDonations || 0,
        totalEvents: totalEvents || 0,
        totalAlbums: albumsCount || 0,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================== DONATION MANAGEMENT ========================
// GET /api/admin/dashboard/donations
exports.getAllDonations = async (req, res) => {
  try {
    const { status, currency, paymentMethod, startDate, endDate, sortBy } =
      req.query;
    let filter = {};
    if (status) filter.status = status;
    if (currency) filter.currency = currency;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === "amount") sortOptions = { amount: -1 };
    else if (sortBy === "donor") sortOptions = { donorName: 1 };

    const donations = await Donation.find(filter)
      .populate("alumniId", "donorName donorEmail")
      .sort(sortOptions);

    const completed = donations.filter((d) => d.status === "completed");
    const summary = {
      totalDonations: donations.length,
      completedDonations: completed.length,
      totalAmount: completed.reduce((sum, d) => sum + d.amount, 0),
      pendingAmount: donations
        .filter((d) => d.status === "pending")
        .reduce((sum, d) => sum + d.amount, 0),
    };

    res.json({
      message: "Donations retrieved successfully",
      count: donations.length,
      summary,
      donations,
    });
  } catch (error) {
    console.error("Get Donations Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
