const express = require("express");
const {
  getBankrolls,
  addBankroll,
  updateBankroll,
  deleteBankroll,
  getBankrollById,
  getTopBankrolls,
  getAnalytics,
} = require("../controllers/bankrollController");
const { authenticate } = require("../middlewares/authMiddleware");
const { validateBankroll } = require("../utils/validators");
const { validate } = require("../middlewares/validationMiddleware");

const router = express.Router();

// Protected routes
router.get("/", authenticate, getBankrolls);
router.post("/", authenticate, validate(validateBankroll), addBankroll);
router.get("/analytics", authenticate, getAnalytics);
router.put("/:id", authenticate, validate(validateBankroll), updateBankroll);
router.delete("/:id", authenticate, deleteBankroll);
router.get("/top", authenticate, getTopBankrolls); // Moved before `/:id`
router.get("/:id", getBankrollById);

module.exports = router;
