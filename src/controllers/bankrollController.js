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

    // Find all public bankrolls and populate all bets
    const bankrolls = await Bankroll.find({ visibility: "Public" })
      .populate({
        path: "bets",
        // No date filter here, get all bets
      })
      .populate("userId", "username email")
      .exec();

    // Calculate stats for each bankroll (only bets in current quarter)
    const rankedBankrolls = bankrolls.map((bankroll) => {
      // Only consider bets in the current quarter
      const quarterBets = (bankroll.bets || []).filter(
        (bet) => bet.date >= startOfQuarter && bet.date <= endOfQuarter
      );
      const verifiedBets = quarterBets.filter((bet) => bet.isVerified);

      // Total stakes and profit
      const totalStakes = verifiedBets.reduce(
        (sum, bet) => sum + (bet.stake || 0),
        0
      );

      const totalProfit = verifiedBets.reduce((sum, bet) => {
        let profit = 0;
        switch (bet.status) {
          case "Won":
            const gain = bet.stake * bet.odds;
            profit = gain - bet.stake;
            break;
          case "Loss":
            profit = -bet.stake;
            break;
          case "Cashout":
            const cashoutGain = bet.stake * bet.odds;
            profit = cashoutGain - bet.stake - (bet.cashoutAmount || 0);
            break;
          case "Pending":
          case "Void":
            profit = 0;
            break;
        }
        return sum + profit;
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
          profitPercentage: roi.toFixed(2),
          roi: roi.toFixed(2),
          winningRate: winningRate.toFixed(2),
          statusBetDistribution,
          sportBetDistribution,
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

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { filter = "all" } = req.query; // Default to "all"

    let bankrollQuery = { userId };
    if (filter === "public") bankrollQuery.visibility = "Public";
    else if (filter === "private") bankrollQuery.visibility = "Private";

    const bankrolls = await Bankroll.find(bankrollQuery)
      .populate("bets")
      .exec();

    if (!bankrolls.length) {
      return res
        .status(200)
        .json({ message: "No data available for analytics" });
    }

    const allBets = bankrolls.flatMap((bankroll) => bankroll.bets);

    // 1. Win Rate
    const totalBets = allBets.length;
    const wonBets = allBets.filter((bet) => bet.status === "Won").length;
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

    // 2. Stake Consistency Score
    const totalStakes = allBets.reduce((sum, bet) => sum + (bet.stake || 0), 0);
    const avgStake = totalBets > 0 ? totalStakes / totalBets : 0;
    const bankrollSum = bankrolls.reduce(
      (sum, b) => sum + b.startingCapital,
      0
    );
    const stakeConsistencyScore =
      bankrollSum > 0 ? (avgStake / bankrollSum) * 100 : 0;

    // 3. Total Played Staked
    const totalPlayedStaked = totalStakes;

    // 4. Odds Bet Most Frequent
    const oddsRanges = {
      "1.40-1.49": 0,
      "1.50-1.59": 0,
      "1.60-1.69": 0,
      "1.70-1.79": 0,
      "1.80-1.89": 0,
      "1.90-1.99": 0,
      "2.00-2.09": 0,
      "2.10+": 0,
    };
    allBets.forEach((bet) => {
      const odd = bet.odds;
      if (odd >= 1.4 && odd <= 1.49) oddsRanges["1.40-1.49"]++;
      else if (odd >= 1.5 && odd <= 1.59) oddsRanges["1.50-1.59"]++;
      else if (odd >= 1.6 && odd <= 1.69) oddsRanges["1.60-1.69"]++;
      else if (odd >= 1.7 && odd <= 1.79) oddsRanges["1.70-1.79"]++;
      else if (odd >= 1.8 && odd <= 1.89) oddsRanges["1.80-1.89"]++;
      else if (odd >= 1.9 && odd <= 1.99) oddsRanges["1.90-1.99"]++;
      else if (odd >= 2.0 && odd <= 2.09) oddsRanges["2.00-2.09"]++;
      else if (odd >= 2.1) oddsRanges["2.10+"]++;
    });

    // 5. Status Bet Distribution
    const statusDistribution = {
      Won: 0,
      Lost: 0,
      Void: 0,
      "Cash Out": 0,
    };
    allBets.forEach((bet) => {
      statusDistribution[bet.status] =
        (statusDistribution[bet.status] || 0) + 1;
    });
    const statusPercentages = {};
    for (const status in statusDistribution) {
      statusPercentages[status] =
        totalBets > 0 ? (statusDistribution[status] / totalBets) * 100 : 0;
    }

    // 6. Type of Sports
    const sportDistribution = {};
    allBets.forEach((bet) => {
      sportDistribution[bet.sport] = (sportDistribution[bet.sport] || 0) + 1;
    });
    const sportPercentages = {};
    for (const sport in sportDistribution) {
      sportPercentages[sport] =
        totalBets > 0 ? (sportDistribution[sport] / totalBets) * 100 : 0;
    }

    // 7. Profit Per Day of Week
    const profitByDay = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };
    allBets.forEach((bet) => {
      const day = new Date(bet.date).toLocaleString("en-US", {
        weekday: "short",
      });
      if (bet.status === "Won") profitByDay[day] += bet.stake * (bet.odds - 1);
      else if (bet.status === "Loss") profitByDay[day] -= bet.stake;
      else if (bet.status === "Cash Out" && bet.cashoutAmount)
        profitByDay[day] += bet.cashoutAmount - bet.stake;
    });

    // 8. Profit Per Month
    const profitByMonth = {};
    allBets.forEach((bet) => {
      const month = new Date(bet.date).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      profitByMonth[month] = profitByMonth[month] || 0;
      if (bet.status === "Won")
        profitByMonth[month] += bet.stake * (bet.odds - 1);
      else if (bet.status === "Loss") profitByMonth[month] -= bet.stake;
      else if (bet.status === "Cash Out" && bet.cashoutAmount)
        profitByMonth[month] += bet.cashoutAmount - bet.stake;
    });

    res.status(200).json({
      winRate,
      stakeConsistencyScore: { avgStake, percentage: stakeConsistencyScore },
      totalPlayedStaked,
      oddsRanges,
      statusDistribution: statusPercentages,
      sportDistribution: sportPercentages,
      profitByDay,
      profitByMonth,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
