const { calculateBankrollStats } = require("../utils/commonFunction");
const Bankroll = require("../models/Bankroll");
const Bet = require("../models/Bet");
const User = require("../models/User");
const moment = require("moment");

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
    const { name, startingCapital, visibility, currency, isShareable } =
      req.body;

    if (!currency || !currency.code || !currency.label || !currency.symbol) {
      return res.status(400).json({ message: "Invalid currency data" });
    }

    // Check if the user already has a public bankroll
    if (visibility === "Public") {
      const existingPublicBankroll = await Bankroll.findOne({
        userId: req.user._id,
        visibility: "Public",
      });

      if (existingPublicBankroll) {
        return res.status(400).json({
          message: "You can only have one public bankroll at a time.",
        });
      }
    }

    const newBankroll = new Bankroll({
      name,
      startingCapital,
      visibility,
      currency,
      userId: req.user._id,
      isShareable: isShareable || false,
    });

    await newBankroll.save();

    // Assign the shareableLink after _id is generated
    if (isShareable) {
      newBankroll.shareableLink = `${process.env.FRONTEND_URL}/bankroll/view/${newBankroll._id}`;
      await newBankroll.save();
    }

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
    const { isShareable, visibility } = req.body;

    if (visibility === "Public") {
      const existingPublicBankroll = await Bankroll.findOne({
        userId: req.user._id,
        visibility: "Public",
        _id: { $ne: id },
      });

      if (existingPublicBankroll) {
        return res.status(400).json({
          message: "You can only have one public bankroll at a time.",
        });
      }

      const currentBankroll = await Bankroll.findById(id);
      if (currentBankroll.visibility === "Private") {
        await Bet.deleteMany({ bankrollId: id });
      }
    }

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
      {
        ...req.body,
        isShareable: isShareable || false,
        shareableLink: isShareable
          ? `${process.env.FRONTEND_URL}/bankroll/view/${id}`
          : null,
      },
      { new: true }
    )
      .populate("bets") // Populate the associated bets
      .exec(); // Ensure the query is executed

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
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteBankroll = async (req, res) => {
  try {
    const { id } = req.params;

    const bankroll = await Bankroll.findOne({ _id: id, userId: req.user._id });

    if (!bankroll) {
      return res.status(404).json({ message: "Bankroll not found" });
    }

    await Bet.deleteMany({ bankrollId: id });

    await Bankroll.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "Bankroll and associated bets deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getBankrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const bankroll = await Bankroll.findOne({ _id: id })
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
    // Get the start and end of the current quarter
    const startOfQuarter = moment().startOf("quarter").toDate();
    const endOfQuarter = moment().endOf("quarter").toDate();

    // Find all public bankrolls with bets in the current quarter
    const bankrolls = await Bankroll.find({ visibility: "Public" })
      .populate({
        path: "bets",
        match: { date: { $gte: startOfQuarter, $lte: endOfQuarter } }, // Filter bets in the quarter
      })
      .populate("userId", "username email")
      .exec();

    // Calculate stats for each bankroll
    const rankedBankrolls = bankrolls.map((bankroll) => {
      const verifiedBets = bankroll.bets.filter((bet) => bet.isVerified);

      // Total stakes and profit
      const totalStakes = verifiedBets.reduce(
        (sum, bet) => sum + (bet.stake || 0),
        0
      );

      const totalProfit = verifiedBets.reduce((sum, bet) => {
        if (bet.status === "Won") {
          const gain = bet.stake * bet.odds;
          return sum + (gain - bet.stake);
        } else if (bet.status === "Loss") {
          return sum - bet.stake;
        }
        return sum;
      }, 0);

      // ROI (Return on Investment)
      const roi = totalStakes > 0 ? (totalProfit / totalStakes) * 100 : 0;

      // Winning Rate
      const totalBets = verifiedBets.length;
      const wonBets = verifiedBets.filter((bet) => bet.status === "Won").length;
      const winningRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

      // % of Status Bet Distribution (Won/Loss/Void/Cash Out)
      const statusBetDistribution = verifiedBets.reduce(
        (acc, bet) => {
          acc[bet.status] = (acc[bet.status] || 0) + 1;
          return acc;
        },
        { Won: 0, Loss: 0, Void: 0, "Cash Out": 0 }
      );

      // % of Sport Bet Distribution (Football, Tennis, etc.)
      const sportBetDistribution = verifiedBets.reduce(
        (acc, bet) => {
          acc[bet.sport] = (acc[bet.sport] || 0) + 1;
          return acc;
        },
        {
          Football: 0,
          Tennis: 0,
          Basketball: 0,
          Volleyball: 0,
          "American Football": 0,
          "Ice Hockey": 0,
          "Other Sport": 0,
        }
      );

      return {
        ...bankroll.toObject(),
        stats: {
          totalStakes: totalStakes.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          profitPercentage: roi.toFixed(2), // ROI is the same as profitPercentage
          roi: roi.toFixed(2), // ROI
          winningRate: winningRate.toFixed(2), // Winning Rate
          statusBetDistribution, // % of Status Bet Distribution
          sportBetDistribution, // % of Sport Bet Distribution
        },
      };
    });

    // Sort bankrolls by profit percentage (ROI) in descending order
    rankedBankrolls.sort(
      (a, b) =>
        parseFloat(b.stats.profitPercentage) -
        parseFloat(a.stats.profitPercentage)
    );

    res.status(200).json(rankedBankrolls.slice(0, 10));
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
