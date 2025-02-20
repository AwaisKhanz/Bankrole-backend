exports.calculateBankrollStats = (bankroll) => {
  // First, modify all bets to ensure consistency
  const allModifiedBets = bankroll.bets.map((bet) => {
    let gain = 0;
    let profit = 0;

    switch (bet.status) {
      case "Won":
        gain = bet.odds * bet.stake;
        profit = gain - bet.stake;
        break;
      case "Loss":
        gain = 0;
        profit = -bet.stake;
        break;
      case "Cashout":
        gain = bet.odds * bet.stake;
        profit = gain - bet.stake;
        gain = gain - bet.cashoutAmount;
        profit = profit - bet.cashoutAmount;
        break;
      case "Pending":
      case "Void":
        gain = 0;
        profit = 0;
        break;
    }

    return {
      ...bet.toObject(),
      gain: gain.toFixed(2),
      profit: profit.toFixed(2),
    };
  });

  // ✅ Filter bets for calculation:
  // - If Public -> Only include "Accepted" & Verified bets for stats
  // - If Private -> Include all bets in stats
  const filteredBets =
    bankroll.visibility === "Public"
      ? allModifiedBets.filter(
          (bet) => bet.verificationStatus === "Accepted" && bet.isVerified
        )
      : allModifiedBets;

  // ✅ Calculate statistics only on filtered bets
  const totalStakes = filteredBets.reduce(
    (sum, bet) => sum + (bet.stake || 0),
    0
  );

  const totalProfit = filteredBets.reduce(
    (sum, bet) => sum + parseFloat(bet.profit),
    0
  );

  const roi = totalStakes > 0 ? (totalProfit / totalStakes) * 100 : 0;
  const progression =
    bankroll.startingCapital > 0
      ? (totalProfit / bankroll.startingCapital) * 100
      : 0;

  const pendingBetsCount = allModifiedBets.filter(
    (bet) => bet.verificationStatus !== "Accepted"
  ).length;

  const isVerified =
    bankroll.visibility === "Public"
      ? pendingBetsCount === 0 && filteredBets.length > 0
      : true;

  return {
    totalStakes: totalStakes.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    roi: roi.toFixed(2),
    progression: progression.toFixed(2),
    pendingBetsCount,
    modifiedBets: allModifiedBets, // ✅ Includes ALL bets
    isVerified: bankroll.visibility === "Public" && isVerified,
  };
};
