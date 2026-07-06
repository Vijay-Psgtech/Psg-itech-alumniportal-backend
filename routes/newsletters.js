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

router.get("/", getAllNewsLetters);
router.get("/recent", getRecentNewsLetters);

router.get("/:id", getNewsLetterById);


// ✅ FIXED v2: Using upload.any() for maximum compatibility
// This accepts ANY file fields without needing to declare them all
router.post("/", upload.any(), createNewsLetter);

router.put("/:id", upload.any(), updateNewsLetter);

router.delete("/:id", deleteNewsLetter);
router.get("/category/:category", getNewsLettersByCategory);

module.exports = router;