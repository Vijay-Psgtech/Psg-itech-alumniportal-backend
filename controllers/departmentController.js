// backend/controllers/departmentController.js
// ✅ FIXED: Uses req.user._id consistently
const Department = require("../models/Department");

// ── PUBLIC: GET ALL ACTIVE DEPARTMENTS ──
exports.getAllDepartments = async (req, res) => {
  try {
    const { programmeType } = req.query;

    let filter = { active: true };

    if (programmeType) filter.programmeType = programmeType;


    const departments = await Department.find(filter)
      .select("name degree programmeType")
      .sort("name");

    res.json({
      success: true,
      data: {
        departments,
      },
    });
  } catch (error) {
    console.error("Get All Departments Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ── PUBLIC: GET DEPARTMENTS BY PROGRAMME AND FUNDING TYPE ──
exports.getDepartmentsByType = async (req, res) => {
  try {
    const { programmeType } = req.params;

    if (!programmeType) {
      return res.status(400).json({
        success: false,
        message: "Programme type is required",
      });
    }

    const departments = await Department.find({
      programmeType,
      active: true,
    })
      .select("name degree")
      .sort("name");

    res.json({
      success: true,
      data: {
        departments,
      },
    });
  } catch (error) {
    console.error("Get Departments By Type Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ── ADMIN: CREATE DEPARTMENT ──
exports.createDepartment = async (req, res) => {
  try {
    const { name, degree, programmeType, description } = req.body;
    // ✅ FIX: Check for _id (set by authMiddleware)
    if (!req.user || !req.user._id) {
      console.error("❌ User not authenticated. req.user:", req.user);
      return res.status(401).json({
        success: false,
        message: "User not authenticated. Please login first.",
      });
    }

    // Validation
    if (!name || !degree || !programmeType) {
      return res.status(400).json({
        success: false,
        message: "Name, degree, and programme type are required",
      });
    }

    // Validate programmeType  values
    if (!["UG", "PG"].includes(programmeType)) {
      return res.status(400).json({
        success: false,
        message: "Programme type must be either 'UG' or 'PG'",
      });
    }

    // Check if department already exists
    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Department already exists",
      });
    }

    const department = new Department({
      name: name.trim(),
      degree: degree.trim(),
      programmeType,
      description: description?.trim() || "",
      createdBy: req.user._id,  // ✅ FIX: Uses _id
    });


    await department.save();

    // Populate createdBy info in respons
    await department.populate("createdBy", "firstName lastName email");


    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: { department },
    });
  } catch (error) {
    console.error("Create Department Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create department",
    });
  }
};

// ── ADMIN: UPDATE DEPARTMENT ──
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, degree, programmeType, description, active } =
      req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Check if new name already exists (excluding current department)
    if (name && name !== department.name) {
      const existing = await Department.findOne({ name: name.trim() });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Department name already exists",
        });
      }
    }

    // Validate enum values if provided
    if (programmeType && !["UG", "PG"].includes(programmeType)) {
      return res.status(400).json({
        success: false,
        message: "Programme type must be either 'UG' or 'PG'",
      });
    }


    // Update fields
    if (name) department.name = name.trim();
    if (degree) department.degree = degree.trim();
    if (programmeType) department.programmeType = programmeType;
    if (description !== undefined) department.description = description.trim();
    if (active !== undefined) department.active = active;

    await department.save();

    // Populate createdBy info in response
    await department.populate("createdBy", "firstName lastName email");

    res.json({
      success: true,
      message: "Department updated successfully",
      data: { department },
    });
  } catch (error) {
    console.error("Update Department Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update department",
    });
  }
};

// ── ADMIN: DELETE DEPARTMENT ──
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.json({
      success: true,
      message: "Department deleted successfully",
      data: { department },
    });
  } catch (error) {
    console.error("Delete Department Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete department",
    });
  }
};

// ── ADMIN: GET ALL DEPARTMENTS (INCLUDING INACTIVE) ──
exports.getAllDepartmentsAdmin = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("createdBy", "firstName lastName email")
      .sort("name");

    res.json({
      success: true,
      data: {
        departments,
        total: departments.length,
      },
    });
  } catch (error) {
    console.error("Get All Departments Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch departments",
    });
  }
};

// ── ADMIN: TOGGLE DEPARTMENT ACTIVE STATUS ──
exports.toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    department.active = !department.active;
    await department.save();

    // Populate createdBy info in response
    await department.populate("createdBy", "firstName lastName email");

    res.json({
      success: true,
      message: `Department ${department.active ? "activated" : "deactivated"}`,
      data: { department },
    });
  } catch (error) {
    console.error("Toggle Department Status Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update department status",
    });
  }
};