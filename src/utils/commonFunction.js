exports.calculateBankrollStats = (bankroll) => {
  const modifiedBets = bankroll.bets.map((bet) => {
    let gain = 0;
    let profit = 0;

    if (bet.status === "Won") {
      gain = bet.odds * bet.stake;
      profit = gain - bet.stake;
    } else if (bet.status === "Loss") {
      gain = 0;
      profit = -bet.stake;
    }

    return {
      ...bet.toObject(), // Ensure we're working with plain objects
      gain: gain.toFixed(2),
      profit: profit.toFixed(2),
    };
  });

  const verifiedBets = modifiedBets.filter((bet) => bet.isVerified);

  const totalStakes = verifiedBets.reduce(
    (sum, bet) => sum + (bet.stake || 0),
    0
  );

  const totalProfit = verifiedBets.reduce(
    (sum, bet) => sum + parseFloat(bet.profit),
    0
  );

  const roi = totalStakes > 0 ? (totalProfit / totalStakes) * 100 : 0;
  const progression =
    bankroll.startingCapital > 0
      ? (totalProfit / bankroll.startingCapital) * 100
      : 0;

  const pendingBetsCount = modifiedBets.filter((bet) => !bet.isVerified).length;

  return {
    totalStakes,
    totalProfit: totalProfit.toFixed(2),
    roi: roi.toFixed(2),
    progression: progression.toFixed(2),
    pendingBetsCount,
    modifiedBets, // Include the modified bets with gain and profit
  };
};
