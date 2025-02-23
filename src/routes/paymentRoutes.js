const express = require("express");
const {
  createSubscription,
  cancelSubscription,
  getSubscription,
  handleWebhook,
  getPaymentMethod,
  updatePaymentMethod,
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

router.get("/payment-method", authenticate, getPaymentMethod); // New route
router.post("/update-payment-method", authenticate, updatePaymentMethod); // New route

module.exports = router;
