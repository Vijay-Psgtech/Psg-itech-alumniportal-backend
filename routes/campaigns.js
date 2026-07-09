const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Campaign = require("../models/Campaign");
const CampaignResponse = require("../models/Campaignresponse");

// ==============================
// ✅ SPECIFIC ROUTES FIRST
// Response-specific endpoints (must come before campaign/:id routes)
// ==============================

// ==============================
// GET SINGLE RESPONSE
// ==============================
router.get("/response/:responseId", async (req, res) => {
  try {
    const { responseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(responseId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid response ID format: "${responseId}"`,
      });
    }

    const response = await CampaignResponse.findById(responseId);

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Response not found",
      });
    }

    res.status(200).json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("❌ Get response error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch response",
      error: error.message,
    });
  }
});

// ==============================
// UPDATE RESPONSE STATUS
// ==============================
router.put("/response/:responseId/status", async (req, res) => {
  try {
    const { responseId } = req.params;
    const { status, adminNotes, adminRating } = req.body;

    if (!mongoose.Types.ObjectId.isValid(responseId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid response ID format: "${responseId}"`,
      });
    }

    const response = await CampaignResponse.findByIdAndUpdate(
      responseId,
      {
        status,
        adminNotes,
        adminRating,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Response not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Response updated successfully",
      response,
    });
  } catch (error) {
    console.error("❌ Update response error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update response",
      error: error.message,
    });
  }
});

// ==============================
// PUBLISH RESPONSE AS STORY
// ==============================
router.post("/response/:responseId/publish", async (req, res) => {
  try {
    const { responseId } = req.params;
    const { title } = req.body;

    if (!mongoose.Types.ObjectId.isValid(responseId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid response ID format: "${responseId}"`,
      });
    }

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required to publish",
      });
    }

    const response = await CampaignResponse.findByIdAndUpdate(
      responseId,
      {
        status: "Published",
        isPublished: true,
        publishedTitle: title,
        publishedAt: new Date(),
      },
      { new: true }
    );

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Response not found",
      });
    }


    res.status(200).json({
      success: true,
      message: "Response published successfully",
      response,
    });
  } catch (error) {
    console.error("❌ Publish response error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish response",
      error: error.message,
    });
  }
});

// ==============================
// DELETE RESPONSE
// ==============================
router.delete("/response/:responseId", async (req, res) => {
  try {
    const { responseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(responseId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid response ID format: "${responseId}"`,
      });
    }

    const response = await CampaignResponse.findByIdAndDelete(responseId);

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Response not found",
      });
    }

    // ✅ Decrement campaign response count
    if (response.campaignId) {
      const campaign = await Campaign.findById(response.campaignId);
      if (campaign) {
        campaign.totalResponses = Math.max(0, (campaign.totalResponses || 0) - 1);
        campaign.responses = (campaign.responses || []).filter(
          (id) => id.toString() !== response._id.toString()
        );
        await campaign.save();
      }
    }


    res.status(200).json({
      success: true,
      message: "Response deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete response error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete response",
      error: error.message,
    });
  }
});

// ==============================
// ✅ CAMPAIGN-SPECIFIC EXPORT & ANALYTICS
// (Must come before generic /:id routes)
// ==============================

// ==============================
// EXPORT RESPONSES AS CSV
// ==============================
router.get("/:id/responses/export", async (req, res) => {
  try {
    const { id } = req.params;
    const { status: statusFilter } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid campaign ID format: "${id}"`,
      });
    }

    // ✅ Get campaign
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // ✅ Get responses with optional status filter
    const filter = { campaignId: id };

    if (statusFilter && statusFilter !== "all") {
      filter.status = statusFilter;
    }

    const responses = await CampaignResponse.find(filter).sort({
      submittedAt: -1,
    });

    if (responses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No responses to export",
      });
    }

    // ✅ Build CSV
    let csv = "Respondent Name,Email,Batch,Department,Status,Submitted Date";

    // ✅ Add form field headers
    const allFieldNames = new Set();
    responses.forEach((r) => {
      if (r.responseData) {
        Object.keys(r.responseData).forEach((key) => allFieldNames.add(key));
      }
    });

    const fieldHeaders = Array.from(allFieldNames).join(",");
    if (fieldHeaders) {
      csv += "," + fieldHeaders;
    }

    csv += "\n";

    // ✅ Add response data rows
    responses.forEach((r) => {
      const row = [
        `"${(r.respondentName || "").replace(/"/g, '""')}"`,
        r.respondentEmail || "",
        r.respondentBatch || "",
        r.respondentDepartment || "",
        r.status || "Unknown",
        new Date(r.submittedAt || r.createdAt).toLocaleDateString(),
      ];

      // ✅ Add response data fields
      allFieldNames.forEach((field) => {
        const value = r.responseData?.[field];
        if (value !== undefined && value !== null) {
          const val = Array.isArray(value) ? value.join("; ") : String(value);
          row.push(`"${val.replace(/"/g, '""')}"`);
        } else {
          row.push('""');
        }
      });

      csv += row.join(",") + "\n";
    });

    // ✅ Send as file
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="campaign-responses-${id}-${new Date()
        .toISOString()
        .split("T")[0]}.csv"`
    );
    res.send(csv);

  } catch (error) {
    console.error("❌ Export responses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export responses",
      error: error.message,
    });
  }
});

// ==============================
// GET CAMPAIGN ANALYTICS
// ==============================
router.get("/:id/analytics", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid campaign ID format: "${id}"`,
      });
    }

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const responses = await CampaignResponse.find({ campaignId: id });

    const analytics = {
      totalResponses: campaign.totalResponses || 0,
      totalViews: campaign.views || 0,
      formOpens: campaign.formOpens || 0,
      submissionRate: campaign.submissionRate || 0,
      byStatus: {
        submitted: responses.filter((r) => r.status === "Submitted").length,
        published: responses.filter((r) => r.status === "Published").length,
        viewed: responses.filter((r) => r.status === "Viewed").length,
        rejected: responses.filter((r) => r.status === "Rejected").length,
        flagged: responses.filter((r) => r.status === "Flagged").length,
      },
      averageRating:
        responses.length > 0
          ? (
              responses
                .filter((r) => r.adminRating)
                .reduce((sum, r) => sum + (r.adminRating || 0), 0) /
              responses.filter((r) => r.adminRating).length
            ).toFixed(2)
          : 0,
    };

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("❌ Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
});

// ==============================
// ✅ CAMPAIGN RESPONSE ENDPOINTS
// ==============================

// ==============================
// GET ALL RESPONSES FOR CAMPAIGN
// ==============================
router.get("/:id/responses", async (req, res) => {
  try {
    const { id } = req.params;
    const { status: statusFilter } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid campaign ID format: "${id}"`,
      });
    }

    // ✅ Verify campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // ✅ Filter by status if provided
    const filter = { campaignId: id };

    if (statusFilter && statusFilter !== "all") {
      filter.status = statusFilter;
    }

    const responses = await CampaignResponse.find(filter).sort({
      submittedAt: -1,
    });

    console.log(`📊 Fetched ${responses.length} responses for campaign ${id}`);

    res.status(200).json({
      success: true,
      count: responses.length,
      responses,
      data: responses,
    });
  } catch (error) {
    console.error("❌ Get responses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch responses",
      error: error.message,
    });
  }
});

// ==============================
// SUBMIT CAMPAIGN RESPONSE
// ==============================
router.post("/:id/respond", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      respondentId,
      respondentName,
      respondentEmail,
      respondentBatch,
      respondentDepartment,
      responseData,
      uploadedFiles,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid campaign ID format: "${id}"`,
      });
    }

    // ✅ Validate campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // ✅ Validate required fields
    if (!respondentName || !respondentEmail) {
      return res.status(400).json({
        success: false,
        message: "Respondent name and email are required",
      });
    }

    // ✅ Create response
    const response = await CampaignResponse.create({
      campaignId: id,
      respondentId: respondentId || null,
      respondentName,
      respondentEmail,
      respondentBatch: respondentBatch || "N/A",
      respondentDepartment: respondentDepartment || "N/A",
      responseData: responseData || {},
      uploadedFiles: uploadedFiles || [],
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "Submitted",
    });

    // ✅ Increment response count
    campaign.totalResponses = (campaign.totalResponses || 0) + 1;
    campaign.responses = campaign.responses || [];
    campaign.responses.push(response._id);
    await campaign.save();


    res.status(201).json({
      success: true,
      message: "Response submitted successfully",
      response,
    });
  } catch (error) {
    console.error("❌ Submit response error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit response",
      error: error.message,
    });
  }
});

// ==============================
// ✅ CAMPAIGN CRUD OPERATIONS
// ==============================

// ==============================
// GET ALL CAMPAIGNS
// ==============================
router.get("/", async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });

    console.log(`📊 Fetched ${campaigns.length} campaigns`);

    res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    console.error("❌ Get campaigns error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
      error: error.message,
    });
  }
});

// ==============================
// CREATE CAMPAIGN
// ==============================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      startDate,
      endDate,
      duration,
      formFields,
      coverImage,
      targetAudience,
      specificBatches,
      specificDepartments,
      allowPublishing,
      sendNotifications,
      tags,
      createdBy,
    } = req.body;

    // ✅ Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and category are required",
      });
    }

    // ✅ Build campaign data
    const campaignData = {
      title: title.trim(),
      description: description.trim(),
      category,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + (duration || 14) * 24 * 60 * 60 * 1000),
      duration: duration || 14,
      formFields: formFields || [],
      status: "Draft",
      totalResponses: 0,
      responses: [],
      createdBy: createdBy || new mongoose.Types.ObjectId(),
      updatedBy: createdBy || new mongoose.Types.ObjectId(),
    };

    // ✅ Optional fields
    if (coverImage) campaignData.coverImage = coverImage;
    if (targetAudience) campaignData.targetAudience = targetAudience;
    if (specificBatches) campaignData.specificBatches = specificBatches;
    if (specificDepartments) campaignData.specificDepartments = specificDepartments;
    if (allowPublishing !== undefined) campaignData.allowPublishing = allowPublishing;
    if (sendNotifications !== undefined) campaignData.sendNotifications = sendNotifications;
    if (tags) campaignData.tags = tags;

    const campaign = await Campaign.create(campaignData);


    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
      campaignId: campaign._id,
    });
  } catch (error) {
    console.error("❌ Create campaign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create campaign",
      error: error.message,
    });
  }
});

// ==============================
// GET SINGLE CAMPAIGN
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid campaign ID format: "${id}"`,
      });
    }

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error("❌ Get campaign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaign",
      error: error.message,
    });
  }
});

// ==============================
// UPDATE CAMPAIGN
// ==============================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid campaign ID format: "${id}"`,
      });
    }

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      {
        ...req.body,
        updatedBy: req.body.updatedBy || new mongoose.Types.ObjectId(),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }


    res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    console.error("❌ Update campaign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update campaign",
      error: error.message,
    });
  }
});

// ==============================
// DELETE CAMPAIGN
// ==============================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid campaign ID format: "${id}"`,
      });
    }

    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // ✅ Delete all responses for this campaign
    await CampaignResponse.deleteMany({ campaignId: id });

    res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete campaign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
      error: error.message,
    });
  }
});

module.exports = router;