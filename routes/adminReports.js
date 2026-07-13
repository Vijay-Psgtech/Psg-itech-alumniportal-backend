const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const { getAlumniByYear, getAlumniByDepartment, getAlumniDeptWise, getAlumniBatchWise } = require("../controllers/adminReportsController");

//router.use(adminAuth); // Protect all routes below

router.get("/alumni-data-by-year", getAlumniByYear);
router.get("/alumni-data-by-department", getAlumniByDepartment);
router.get("/departmentwise-alumni-data", getAlumniDeptWise);
router.get("/batchYearwise-alumni-data", getAlumniBatchWise);


module.exports = router;
