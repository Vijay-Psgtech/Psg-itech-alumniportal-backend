// backend/controllers/donationController.js
const Donation = require("../models/Donation");
const crypto = require("crypto");

// ═════════════════════════════════════════════════════════════════════════
// CREATE DONATION
// ═════════════════════════════════════════════════════════════════════════
exports.createDonations = async (req, res) => {
  try {
    const {
      donorName,
      donorEmail,
      donorPhone,
      donorCity,
      donorState,
      donorCountry,
      amount,
      currency,
      paymentMethod,
      paymentGateway,
      message,
      isAnonymous,
      alumniId,
    } = req.body;

    // Validation
    if (!donorName || !amount || !currency || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: donorName, amount, currency, paymentMethod",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Donation amount must be greater than 0",
      });
    }

    // Create new donation
    const donation = new Donation({
      donorName: isAnonymous ? "Anonymous Donor" : donorName,
      donorEmail: isAnonymous ? null : donorEmail,
      donorPhone,
      donorCity,
      donorState,
      donorCountry,
      amount,
      currency,
      paymentMethod,
      paymentGateway: paymentGateway || "manual",
      message,
      isAnonymous: isAnonymous || false,
      alumniId: alumniId || null,
      status: paymentGateway ? "pending" : "pending",
      transactionId: `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    });

    await donation.save();

    console.log("✅ Donation created:", donation._id);

    return res.status(201).json({
      success: true,
      message: "Donation created successfully",
      donation,
    });
  } catch (error) {
    console.error("❌ Error creating donation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create donation",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// VERIFY RAZORPAY PAYMENT
// ═════════════════════════════════════════════════════════════════════════
exports.verifyRazorPay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay verification details",
      });
    }

    // Verify signature (you'll need your Razorpay key secret)
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay signature",
      });
    }

    // Update donation status
    const donation = await Donation.findOneAndUpdate(
      { transactionId: razorpay_order_id },
      {
        status: "completed",
        transactionId: razorpay_payment_id,
        completedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    console.log("✅ Razorpay payment verified:", razorpay_payment_id);

    return res.json({
      success: true,
      message: "Payment verified successfully",
      donation,
    });
  } catch (error) {
    console.error("❌ Error verifying Razorpay payment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// GET ALL DONATIONS (ADMIN ONLY)
// ═════════════════════════════════════════════════════════════════════════
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find().populate("alumniId").sort({ createdAt: -1 });

    const stats = {
      total: donations.length,
      completed: donations.filter((d) => d.status === "completed").length,
      pending: donations.filter((d) => d.status === "pending").length,
      failed: donations.filter((d) => d.status === "failed").length,
      cancelled: donations.filter((d) => d.status === "cancelled").length,
      totalAmount: donations.reduce((sum, d) => sum + d.amount, 0),
      averageAmount: donations.length > 0 ? Math.round(donations.reduce((sum, d) => sum + d.amount, 0) / donations.length) : 0,
    };

    console.log("✅ Fetched all donations");

    return res.json({
      success: true,
      donations,
      stats,
    });
  } catch (error) {
    console.error("❌ Error fetching donations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch donations",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// GET DONATION HISTORY WITH FILTERS & PAGINATION
// ═════════════════════════════════════════════════════════════════════════
exports.getDonationHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "all",
      currency = "all",
      paymentMethod = "all",
      donorType = "all",
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate = "",
      endDate = "",
      minAmount = "",
      maxAmount = "",
    } = req.query;

    // Build filter object
    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (currency !== "all") {
      filter.currency = currency;
    }

    if (paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
    }

    if (donorType === "anonymous") {
      filter.isAnonymous = true;
    } else if (donorType === "individual") {
      filter.isAnonymous = false;
    }

    // Search filter (name, email, transaction ID)
    if (search) {
      filter.$or = [
        { donorName: new RegExp(search, "i") },
        { donorEmail: new RegExp(search, "i") },
        { transactionId: new RegExp(search, "i") },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) {
        filter.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter.amount.$lte = parseFloat(maxAmount);
      }
    }

    // Sorting
    const sortObj = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const donations = await Donation.find(filter)
      .populate("alumniId")
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Donation.countDocuments(filter);
    const pages = Math.ceil(total / parseInt(limit));

    // Calculate stats
    const allDonations = await Donation.find(filter);
    const stats = {
      total: allDonations.length,
      completed: allDonations.filter((d) => d.status === "completed").length,
      pending: allDonations.filter((d) => d.status === "pending").length,
      failed: allDonations.filter((d) => d.status === "failed").length,
      cancelled: allDonations.filter((d) => d.status === "cancelled").length,
      flagged: allDonations.filter((d) => d.adminFlagged).length,
      totalAmount: allDonations.reduce((sum, d) => sum + d.amount, 0),
      averageAmount: allDonations.length > 0 ? Math.round(allDonations.reduce((sum, d) => sum + d.amount, 0) / allDonations.length) : 0,
    };

    console.log(`✅ Fetched donation history - Page ${page}, Total: ${total}`);

    return res.json({
      success: true,
      donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages,
      },
      stats,
    });
  } catch (error) {
    console.error("❌ Error fetching donation history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch donation history",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// GET DONATION STATS
// ═════════════════════════════════════════════════════════════════════════
exports.getDonationStats = async (req, res) => {
  try {
    const donations = await Donation.find();

    const stats = {
      total: donations.length,
      completed: donations.filter((d) => d.status === "completed").length,
      pending: donations.filter((d) => d.status === "pending").length,
      failed: donations.filter((d) => d.status === "failed").length,
      cancelled: donations.filter((d) => d.status === "cancelled").length,
      flagged: donations.filter((d) => d.adminFlagged).length,
      totalAmount: donations.reduce((sum, d) => sum + d.amount, 0),
      averageAmount: donations.length > 0 ? Math.round(donations.reduce((sum, d) => sum + d.amount, 0) / donations.length) : 0,
      byPaymentMethod: {
        upi: donations.filter((d) => d.paymentMethod === "UPI").length,
        netbanking: donations.filter((d) => d.paymentMethod === "Net Banking").length,
        card: donations.filter((d) => d.paymentMethod === "Card").length,
        cheque: donations.filter((d) => d.paymentMethod === "Cheque").length,
        wiretransfer: donations.filter((d) => d.paymentMethod === "Wire Transfer").length,
      },
      byCurrency: {
        inr: donations.filter((d) => d.currency === "INR").length,
        usd: donations.filter((d) => d.currency === "USD").length,
      },
    };

    console.log("✅ Fetched donation stats");

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// GET DONATION BY ID
// ═════════════════════════════════════════════════════════════════════════
exports.getDonationById = async (req, res) => {
  try {
    const { id } = req.params;

    const donation = await Donation.findById(id).populate("alumniId");

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    console.log("✅ Fetched donation by ID:", id);

    return res.json({
      success: true,
      donation,
    });
  } catch (error) {
    console.error("❌ Error fetching donation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch donation",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// UPDATE DONATION (ADMIN)
// ═════════════════════════════════════════════════════════════════════════
exports.updateDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote, status, adminFlagged, flaggedReason } = req.body;

    const donation = await Donation.findByIdAndUpdate(
      id,
      {
        ...(adminNote !== undefined && { adminNote }),
        ...(status !== undefined && { status, completedAt: status === "completed" ? new Date() : null }),
        ...(adminFlagged !== undefined && { adminFlagged, flaggedReason: adminFlagged ? flaggedReason : "" }),
      },
      { new: true }
    ).populate("alumniId");

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    console.log("✅ Donation updated:", id);

    return res.json({
      success: true,
      message: "Donation updated successfully",
      donation,
    });
  } catch (error) {
    console.error("❌ Error updating donation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update donation",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// DELETE DONATION (ADMIN)
// ═════════════════════════════════════════════════════════════════════════
exports.deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;

    const donation = await Donation.findByIdAndDelete(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    console.log("✅ Donation deleted:", id);

    return res.json({
      success: true,
      message: "Donation deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting donation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete donation",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// UPDATE DONATION FLAG STATUS
// ═════════════════════════════════════════════════════════════════════════
exports.flagDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminFlagged, flaggedReason } = req.body;

    const donation = await Donation.findByIdAndUpdate(
      id,
      {
        adminFlagged,
        flaggedReason: adminFlagged ? flaggedReason : "",
        flaggedAt: adminFlagged ? new Date() : null,
      },
      { new: true }
    ).populate("alumniId");

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    console.log(`✅ Donation ${adminFlagged ? "flagged" : "unflagged"}:`, id);

    return res.json({
      success: true,
      message: `Donation ${adminFlagged ? "flagged" : "unflagged"} successfully`,
      donation,
    });
  } catch (error) {
    console.error("❌ Error updating flag status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update flag status",
      error: error.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// UPDATE DONATION STATUS
// ═════════════════════════════════════════════════════════════════════════
exports.updateDonationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "completed", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const donation = await Donation.findByIdAndUpdate(
      id,
      {
        status,
        completedAt: status === "completed" ? new Date() : null,
      },
      { new: true }
    ).populate("alumniId");

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    console.log("✅ Donation status updated:", id, status);

    return res.json({
      success: true,
      message: "Donation status updated successfully",
      donation,
    });
  } catch (error) {
    console.error("❌ Error updating status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};