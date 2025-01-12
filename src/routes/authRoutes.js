const express = require("express");
const {
  register,
  login,
  getProfile,
  getAllUsers,
  deleteUser,
  forgotPassword,
  resetPassword,
  updateProfile,
} = require("../controllers/authController");
const { validateRegistration, validateLogin } = require("../utils/validators");
const { validate } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { adminOnly } = require("../middlewares/roleMiddleware");

const router = express.Router();

// User registration
router.post("/register", validate(validateRegistration), register);

// User login
router.post("/login", validate(validateLogin), login);

// User profile
router.get("/profile", authenticate, getProfile);

// Get all users (Admin only)
router.get("/users", authenticate, adminOnly, getAllUsers);

// Delete user (Admin only)
router.delete("/users/:id", authenticate, adminOnly, deleteUser);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Update user profile (email/username)
router.put("/update-profile", authenticate, updateProfile);

module.exports = router;
