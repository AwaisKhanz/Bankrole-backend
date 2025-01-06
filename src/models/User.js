const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    subscription: {
      status: {
        type: String,
        enum: ["active", "canceled", "past_due", "incomplete"],
        default: "incomplete",
      },
      planId: { type: String },
      currentPeriodEnd: { type: Date },
      customerId: { type: String },
      subscriptionId: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
