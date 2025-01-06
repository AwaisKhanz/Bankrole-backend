const { calculateBankrollStats } = require("../utils/commonFunction");
const Bankroll = require("../models/Bankroll");
const User = require("../models/User");

exports.getBankrolls = async (req, res) => {
  try {
    const bankrolls = await Bankroll.find({ userId: req.user._id })
      .populate({
        path: "bets",
        match: {},
        select: "-__v",
      })
      .exec();

    const bankrollsWithStats = bankrolls.map((bankroll) => {
      const { modifiedBets, ...stats } = calculateBankrollStats(bankroll);
      return {
        ...bankroll.toObject(),
        bets: modifiedBets,
        stats,
      };
    });

    res.status(200).json(bankrollsWithStats);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.addBankroll = async (req, res) => {
  try {
    const { name, startingCapital, visibility, currency } = req.body;

    if (!currency || !currency.code || !currency.label || !currency.symbol) {
      return res.status(400).json({ message: "Invalid currency data" });
    }

    const newBankroll = new Bankroll({
      name,
      startingCapital,
      visibility,
      currency,
      userId: req.user._id,
    });

    await newBankroll.save();

    const { modifiedBets, ...stats } = calculateBankrollStats(newBankroll);

    const bankrollWithStats = {
      ...newBankroll.toObject(),
      bets: modifiedBets,
      stats,
    };

    res.status(201).json({
      message: "Bankroll created successfully",
      bankroll: bankrollWithStats,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateBankroll = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.body.currency) {
      const { code, label, symbol } = req.body.currency;
      if (!code || !label || !symbol) {
        return res
          .status(400)
          .json({ message: "Incomplete currency data for update" });
      }
    }

    const updatedBankroll = await Bankroll.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      req.body,
      { new: true }
    );

    if (!updatedBankroll)
      return res.status(404).json({ message: "Bankroll not found" });

    const { modifiedBets, ...stats } = calculateBankrollStats(updatedBankroll);

    const bankrollWithStats = {
      ...updatedBankroll.toObject(),
      bet: modifiedBets,
      stats,
    };

    res.status(200).json({
      message: "Bankroll updated successfully",
      bankroll: bankrollWithStats,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteBankroll = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBankroll = await Bankroll.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deletedBankroll)
      return res.status(404).json({ message: "Bankroll not found" });

    res.status(200).json({ message: "Bankroll deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getBankrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const bankroll = await Bankroll.findOne({ _id: id, userId: req.user._id })
      .populate("bets")
      .exec();

    if (!bankroll) {
      return res.status(404).json({ message: "Bankroll not found" });
    }

    const { modifiedBets, ...stats } = calculateBankrollStats(bankroll);

    const bankrollWithStats = {
      ...bankroll.toObject(),
      bets: modifiedBets,
      stats,
    };

    res.status(200).json(bankrollWithStats);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getTopBankrolls = async (req, res) => {
  try {
    const bankrolls = await Bankroll.find({ visibility: "Public" })
      .populate("bets")
      .populate("userId", "username email")
      .exec();

    const rankedBankrolls = bankrolls.map((bankroll) => {
      const { modifiedBets, ...stats } = calculateBankrollStats(bankroll);

      return {
        ...bankroll.toObject(),
        bets: modifiedBets,
        stats,
      };
    });

    // Sort by progression in descending order
    rankedBankrolls.sort((a, b) => b.stats.progression - a.stats.progression);

    res.status(200).json(rankedBankrolls.slice(0, 10));
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
