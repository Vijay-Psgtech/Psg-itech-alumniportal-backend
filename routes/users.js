const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authMiddleware, superAdminMiddleware } = require("../middleware/auth");

// Create a new user (Admin only)
router.post("/", authMiddleware, superAdminMiddleware, userController.createUser);
// Get all users (Admin only)
router.get("/", authMiddleware, superAdminMiddleware, userController.getUsers);
// Update user (Admin only)
router.put("/:id", authMiddleware, superAdminMiddleware, userController.updateUser);
// Delete user (Admin only)
router.delete("/:id", authMiddleware, superAdminMiddleware, userController.deleteUser);

module.exports = router;