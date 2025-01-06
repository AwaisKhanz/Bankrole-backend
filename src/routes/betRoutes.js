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

const router = express.Router();

// Admin route to fetch all bets
router.get("/admin/all", authenticate, adminOnly, getAllBetsForAdmin);
router.put("/admin/approve/:id", authenticate, adminOnly, approveBet);
router.put("/admin/reject/:id", authenticate, adminOnly, rejectBet);

// Protected routes
router.get("/:bankrollId", authenticate, getBets);
router.post("/", authenticate, validate(validateBet), addBet);
router.put("/:id", authenticate, validate(validateBet), updateBet);
router.delete("/:id", authenticate, deleteBet);

module.exports = router;
