const mongoose = require("mongoose");

const bankrollSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startingCapital: { type: Number, required: true },
    visibility: {
      type: String,
      enum: ["Public", "Private"],
      default: "Private",
    },
    currency: {
      code: { type: String, required: true },
      label: { type: String, required: true },
      symbol: { type: String, required: true },
    },
    bets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bet" }],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isShareable: { type: Boolean, default: false }, // Enable/disable sharing
    shareableLink: { type: String, unique: true }, // Unique shareable link
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bankroll", bankrollSchema);
