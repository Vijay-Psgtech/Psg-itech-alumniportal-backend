const express = require("express");
const router = express.Router();
const {
    getAllNewsLetters,
    getRecentNewsLetters,
    getNewsLetterById,
    createNewsLetter,
    updateNewsLetter,
    deleteNewsLetter,
    getNewsLettersByCategory
} = require("../controllers/newsLetterController");
const upload = require("../middleware/uploads");
const adminAuth = require("../middleware/adminAuth");

router.get("/", getAllNewsLetters);
router.get("/recent", getRecentNewsLetters);

router.get("/:id", getNewsLetterById);


// ✅ FIXED v2: Using upload.any() for maximum compatibility
// This accepts ANY file fields without needing to declare them all
router.post("/", adminAuth, upload.any(), createNewsLetter);

router.put("/:id", adminAuth, upload.any(), updateNewsLetter);

router.delete("/:id", adminAuth, deleteNewsLetter);
router.get("/category/:category", getNewsLettersByCategory);

module.exports = router;