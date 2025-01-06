const mongoose = require("mongoose");

const betSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bankroll",
      required: true,
    },
    date: { type: Date, required: true },
    sport: { type: String, required: true },
    label: { type: String, required: true },
    stake: { type: Number, required: true },
    odds: { type: Number, required: true },
    verificationCode: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    status: {
      type: String,
      enum: ["Pending", "Won", "Loss"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bet", betSchema);
