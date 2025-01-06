const Bet = require("../models/Bet");
const User = require("../models/User");
const Bankroll = require("../models/Bankroll");

exports.getBets = async (req, res) => {
  try {
    const { bankrollId } = req.params;
    const bets = await Bet.find({ bankrollId, userId: req.user._id });
    res.status(200).json(bets);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.addBet = async (req, res) => {
  try {
    const { bankrollId, ...betData } = req.body;
    const newBet = await Bet.create({
      ...betData,
      bankrollId,
      userId: req.user._id,
    });

    await Bankroll.findByIdAndUpdate(bankrollId, {
      $push: { bets: newBet._id },
    });

    res.status(201).json({ message: "Bet created successfully", bet: newBet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.updateBet = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBet = await Bet.findOne({ _id: id, userId: req.user._id });

    if (!existingBet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    const updateData = {
      ...req.body,
    };

    if (req.body.verificationCode && req.body.verificationCode !== existingBet.verificationCode) {
      updateData.verificationStatus = "Pending";
    }

    const updatedBet = await Bet.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Bet updated successfully", bet: updatedBet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


exports.deleteBet = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBet = await Bet.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deletedBet) return res.status(404).json({ message: "Bet not found" });

    res.status(200).json({ message: "Bet deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getAllBetsForAdmin = async (req, res) => {
  try {
    const { search = "", limit = 10, page = 1 } = req.query;

    const pageSize = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    // Build search query
    const query = search
      ? {
          $or: [
            { sport: { $regex: search, $options: "i" } },
            { label: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalBets = await Bet.countDocuments(query);

    const bets = await Bet.find(query)
      .populate("userId", "username email")
      .populate("bankrollId", "name startingCapital currency")
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    res.status(200).json({
      bets,
      totalBets,
      totalPages: Math.ceil(totalBets / pageSize),
      currentPage,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.approveBet = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await Bet.findById(id);

    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    bet.isVerified = true;
    bet.verificationStatus = "Accepted";
    await bet.save();

    res.status(200).json({ message: "Bet approved successfully", bet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.rejectBet = async (req, res) => {
  try {
    const { id } = req.params;

    const bet = await Bet.findById(id);

    if (!bet) {
      return res.status(404).json({ message: "Bet not found" });
    }

    bet.isVerified = false;
    bet.verificationStatus = "Rejected";
    await bet.save();

    res.status(200).json({ message: "Bet rejected successfully", bet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
