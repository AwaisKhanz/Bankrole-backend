const express = require("express");
const {
  createSubscription,
  cancelSubscription,
  getSubscription,
  handleWebhook,
} = require("../controllers/paymentController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

// Protected Routes
router.post("/create-subscription", authenticate, createSubscription);
router.post("/cancel-subscription", authenticate, cancelSubscription);
router.get("/get-subscription/:userId", authenticate, getSubscription);

// Webhook (No Authentication)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

module.exports = router;
