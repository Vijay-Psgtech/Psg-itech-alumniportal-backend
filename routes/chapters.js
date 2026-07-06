// server/routes/chapters.js

const express = require("express");
const fileUpload = require("express-fileupload");
const router = express.Router();
const chapterController = require("../controllers/chapterController");
const { authMiddleware: protect } = require("../middleware/auth");

router.use(fileUpload());

/* ─── PUBLIC ─── */
router.get("/", chapterController.getChapters);
router.get("/category/:category", chapterController.getChaptersByCategory);

/* ─── AUTHENTICATED (static paths — MUST be before /:id) ─── */
router.get("/my-chapters", protect, chapterController.getMyChapters);

/* ─── ADMIN (static paths — MUST be before /:id) ─── */
router.get("/admin/all", protect, chapterController.getAllChaptersAdmin);
router.get("/admin/pending", protect, chapterController.getPendingChapters);
router.get("/admin/status/:status", protect, chapterController.getChaptersByStatus);
router.get("/admin/:id", protect, chapterController.getChapterDetailsAdmin);

/* ─── DYNAMIC /:id routes LAST ─── */
router.get("/:id", chapterController.getChapterById);
router.get("/:id/members", chapterController.getChapterMembers);

router.post("/", protect, chapterController.createChapter);
router.post("/:id/join", protect, chapterController.joinChapter);

router.put("/:id/approve", protect, chapterController.approveChapter);
router.put("/:id/reject", protect, chapterController.rejectChapter);
router.put("/:id/suspend", protect, chapterController.suspendChapter);
router.put("/:id", protect, chapterController.updateChapter);

router.delete("/:id/leave", protect, chapterController.leaveChapter);
router.delete("/:id/admin", protect, chapterController.deleteChapterAsAdmin);
router.delete("/:id", protect, chapterController.deleteChapter);

module.exports = router;