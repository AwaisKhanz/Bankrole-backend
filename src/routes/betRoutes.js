const express = require("express");
const {
  getBets,
  addBet,
  updateBet,
  deleteBet,
  getAllBetsForAdmin,
  approveBet,
  rejectBet,
} = require("../controllers/betController");
const { authenticate } = require("../middlewares/authMiddleware");
const { adminOnly } = require("../middlewares/roleMiddleware");
const { validateBet } = require("../utils/validators");
const { validate } = require("../middlewares/validationMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

/* ===================== ADMIN ROUTES ===================== */

// Fetch all bets (Admin Only)
router.get("/admin/all", authenticate, adminOnly, getAllBetsForAdmin);

// Approve a bet (Admin Only)
router.put("/admin/approve/:id", authenticate, adminOnly, approveBet);

// Reject a bet (Admin Only)
router.put("/admin/reject/:id", authenticate, adminOnly, rejectBet);

/* ===================== USER ROUTES ===================== */

// Fetch bets by bankroll (User Only)
router.get("/:bankrollId", authenticate, getBets);

// Add a new bet with image upload (User Only)
router.post(
  "/",
  authenticate,
  upload.single("verificationImage"),
  // validate(validateBet),
  addBet
);

// Update a bet with optional image upload (User Only)
router.put(
  "/:id",
  authenticate,
  upload.single("verificationImage"), // Allow updating the image
  validate(validateBet),
  updateBet
);

// Delete a bet (User Only)
router.delete("/:id", authenticate, deleteBet);

module.exports = router;
