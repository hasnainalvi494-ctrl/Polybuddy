/**
 * Position Sizing & Risk Management Module
 * 
 * Professional-grade position sizing with Kelly Criterion, fractional Kelly,
 * and comprehensive risk management tools.
 */

export interface PositionSize {
  // Position Details
  positionAmount: number;        // Dollar amount to bet
  positionShares: number;        // Number of shares to buy
  riskPercentage: number;        // % of bankroll at risk
  kellyPercentage: number;       // Full Kelly %
  fractionalKelly: number;       // Adjusted Kelly (typically 0.25x - 0.5x)
  
  // Risk Management
  stopLoss: number;              // Price to exit if wrong
  takeProfit: number;            // Target exit price
  maxLoss: number;               // Maximum dollar loss
  expectedValue: number;         // Expected profit
  
  // Risk Metrics
  riskRewardRatio: number;       // Potential gain / potential loss
  probabilityOfRuin: number;     // Chance of losing entire bankroll
  sharpeRatio: number;           // Risk-adjusted return metric
  
  // Recommendations
  recommendation: 'aggressive' | 'moderate' | 'conservative' | 'skip';
  warnings: string[];
}

export interface KellyInputs {
  bankroll: number;              // Total capital available
  odds: number;                  // Market odds (0-1, e.g., 0.65 = 65¢)
  edge: number;                  // Your estimated edge (0-1)
  winProbability: number;        // True probability of winning (0-1)
  riskTolerance: 'aggressive' | 'moderate' | 'conservative';
  maxPositionSize?: number;      // Optional cap on position size
  currentExposure?: number;      // Already invested amount
}

/**
 * Calculate optimal position size using Kelly Criterion
 * 
 * Kelly Formula: f* = (bp - q) / b
 * Where:
 *   f* = fraction of bankroll to bet
 *   b = odds received on the bet (net odds)
 *   p = probability of winning
 *   q = probability of losing (1 - p)
 */
export function calculateKellyPosition(
  bankroll: number,
  odds: number,
  edge: number,
  riskTolerance: 'aggressive' | 'moderate' | 'conservative'
): PositionSize {
  
  // Validate inputs
  if (bankroll <= 0) throw new Error('Bankroll must be positive');
  if (odds <= 0 || odds >= 1) throw new Error('Odds must be between 0 and 1');
  if (edge < 0) throw new Error('Edge cannot be negative');
  
  // Calculate win probability from edge
  const winProbability = odds + edge;
  const loseProbability = 1 - winProbability;
  
  // Net odds (potential return per dollar bet)
  const netOdds = (1 - odds) / odds;
  
  // Full Kelly percentage: f* = (bp - q) / b
  const fullKelly = (netOdds * winProbability - loseProbability) / netOdds;
  
  // Cap at reasonable maximum (never bet more than 25% on full Kelly)
  const cappedKelly = Math.min(Math.max(fullKelly, 0), 0.25);
  
  // Apply fractional Kelly based on risk tolerance
  const kellyMultiplier = {
    aggressive: 0.5,      // Half Kelly (50%)
    moderate: 0.25,       // Quarter Kelly (25%)
    conservative: 0.125,  // Eighth Kelly (12.5%)
  };
  
  const fractionalKelly = cappedKelly * kellyMultiplier[riskTolerance];
  
  // Calculate position size
  const positionAmount = bankroll * fractionalKelly;
  const positionShares = positionAmount / odds;
  
  // Risk management levels
  const stopLoss = odds * 0.85;  // 15% stop loss
  const takeProfit = Math.min(odds * 1.3, 0.95);  // 30% take profit, capped at 95¢
  
  // Maximum loss (if stop loss hit)
  const maxLoss = positionAmount * ((odds - stopLoss) / odds);
  
  // Expected value
  const expectedValue = (positionAmount * (1 - odds) / odds * winProbability) - 
                       (positionAmount * loseProbability);
  
  // Risk/reward ratio
  const potentialGain = positionAmount * (takeProfit - odds) / odds;
  const riskRewardRatio = potentialGain / maxLoss;
  
  // Probability of ruin (Kelly-based approximation)
  const probabilityOfRuin = Math.pow(
    loseProbability / winProbability,
    bankroll / positionAmount
  );
  
  // Sharpe ratio approximation
  const expectedReturn = expectedValue / positionAmount;
  const volatility = Math.sqrt(winProbability * Math.pow(1/odds - 1, 2) + 
                                loseProbability * Math.pow(-1, 2));
  const sharpeRatio = expectedReturn / (volatility || 1);
  
  // Generate recommendation
  const { recommendation, warnings } = generateRecommendation(
    fractionalKelly,
    riskRewardRatio,
    edge,
    probabilityOfRuin,
    sharpeRatio
  );
  
  return {
    positionAmount: Math.round(positionAmount * 100) / 100,
    positionShares: Math.round(positionShares * 100) / 100,
    riskPercentage: Math.round(fractionalKelly * 10000) / 100,
    kellyPercentage: Math.round(cappedKelly * 10000) / 100,
    fractionalKelly: Math.round(fractionalKelly * 10000) / 100,
    stopLoss: Math.round(stopLoss * 1000) / 1000,
    takeProfit: Math.round(takeProfit * 1000) / 1000,
    maxLoss: Math.round(maxLoss * 100) / 100,
    expectedValue: Math.round(expectedValue * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    probabilityOfRuin: Math.round(probabilityOfRuin * 10000) / 10000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    recommendation,
    warnings,
  };
}

/**
 * Advanced Kelly calculator with full configuration
 */
export function calculateAdvancedKelly(inputs: KellyInputs): PositionSize {
  const {
    bankroll,
    odds,
    edge,
    winProbability,
    riskTolerance,
    maxPositionSize,
    currentExposure = 0,
  } = inputs;
  
  // Validate inputs
  if (bankroll <= 0) throw new Error('Bankroll must be positive');
  if (odds <= 0 || odds >= 1) throw new Error('Odds must be between 0 and 1');
  if (winProbability <= 0 || winProbability >= 1) {
    throw new Error('Win probability must be between 0 and 1');
  }
  
  const availableBankroll = bankroll - currentExposure;
  if (availableBankroll <= 0) {
    throw new Error('No available bankroll (fully invested)');
  }
  
  // Net odds
  const netOdds = (1 - odds) / odds;
  const loseProbability = 1 - winProbability;
  
  // Full Kelly
  const fullKelly = (netOdds * winProbability - loseProbability) / netOdds;
  
  // Apply safety caps and fractional Kelly
  let fractionalKelly = fullKelly;
  
  if (fullKelly <= 0) {
    // Negative Kelly = no edge, skip bet
    fractionalKelly = 0;
  } else if (fullKelly > 0.25) {
    // Cap at 25%
    fractionalKelly = 0.25;
  }
  
  // Apply risk tolerance multiplier
  const multipliers = {
    aggressive: 0.5,
    moderate: 0.25,
    conservative: 0.125,
  };
  fractionalKelly *= multipliers[riskTolerance];
  
  // Calculate position
  let positionAmount = availableBankroll * fractionalKelly;
  
  // Apply max position size cap if provided
  if (maxPositionSize && positionAmount > maxPositionSize) {
    positionAmount = maxPositionSize;
  }
  
  const positionShares = positionAmount / odds;
  
  // Risk management
  const stopLossPercent = 0.15;  // 15%
  const takeProfitPercent = 0.30;  // 30%
  
  const stopLoss = odds * (1 - stopLossPercent);
  const takeProfit = Math.min(odds * (1 + takeProfitPercent), 0.99);
  
  const maxLoss = positionAmount * stopLossPercent;
  
  // Expected value
  const expectedValue = 
    (positionShares * (1 - odds) * winProbability) - 
    (positionAmount * loseProbability);
  
  // Risk metrics
  const potentialGain = positionShares * (takeProfit - odds);
  const riskRewardRatio = potentialGain / maxLoss;
  
  // Probability of ruin (simplified Kelly formula)
  const probabilityOfRuin = winProbability === 0 ? 1 : 
    Math.pow(loseProbability / winProbability, availableBankroll / positionAmount);
  
  // Sharpe ratio
  const expectedReturn = expectedValue / positionAmount;
  const variance = winProbability * Math.pow((1/odds - 1) - expectedReturn, 2) +
                  loseProbability * Math.pow(-1 - expectedReturn, 2);
  const volatility = Math.sqrt(variance);
  const sharpeRatio = volatility === 0 ? 0 : expectedReturn / volatility;
  
  // Recommendation
  const { recommendation, warnings } = generateRecommendation(
    fractionalKelly,
    riskRewardRatio,
    edge,
    probabilityOfRuin,
    sharpeRatio
  );
  
  return {
    positionAmount: Math.round(positionAmount * 100) / 100,
    positionShares: Math.round(positionShares * 100) / 100,
    riskPercentage: Math.round((positionAmount / bankroll) * 10000) / 100,
    kellyPercentage: Math.round(fullKelly * 10000) / 100,
    fractionalKelly: Math.round(fractionalKelly * 10000) / 100,
    stopLoss: Math.round(stopLoss * 1000) / 1000,
    takeProfit: Math.round(takeProfit * 1000) / 1000,
    maxLoss: Math.round(maxLoss * 100) / 100,
    expectedValue: Math.round(expectedValue * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    probabilityOfRuin: Math.round(probabilityOfRuin * 10000) / 10000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    recommendation,
    warnings,
  };
}

/**
 * Generate recommendation and warnings based on metrics
 */
function generateRecommendation(
  fractionalKelly: number,
  riskRewardRatio: number,
  edge: number,
  probabilityOfRuin: number,
  sharpeRatio: number
): { recommendation: 'aggressive' | 'moderate' | 'conservative' | 'skip'; warnings: string[] } {
  
  const warnings: string[] = [];
  
  // Check for red flags
  if (fractionalKelly <= 0) {
    warnings.push('⚠️ No edge detected - Kelly criterion suggests no bet');
    return { recommendation: 'skip', warnings };
  }
  
  if (edge < 0.05) {
    warnings.push('⚠️ Edge is very small (< 5%) - consider skipping');
  }
  
  if (riskRewardRatio < 1.5) {
    warnings.push('⚠️ Poor risk/reward ratio (< 1.5:1)');
  }
  
  if (probabilityOfRuin > 0.01) {
    warnings.push('🔴 High probability of ruin (> 1%)');
  }
  
  if (sharpeRatio < 0.5) {
    warnings.push('⚠️ Low Sharpe ratio - risk may not be worth reward');
  }
  
  // Determine recommendation
  if (warnings.length >= 3) {
    return { recommendation: 'skip', warnings };
  }
  
  if (fractionalKelly >= 0.15 && riskRewardRatio >= 2.5 && sharpeRatio >= 1.5) {
    return { recommendation: 'aggressive', warnings };
  }
  
  if (fractionalKelly >= 0.08 && riskRewardRatio >= 2.0) {
    return { recommendation: 'moderate', warnings };
  }
  
  if (fractionalKelly >= 0.03 && riskRewardRatio >= 1.5) {
    return { recommendation: 'conservative', warnings };
  }
  
  warnings.push('⚠️ Position size or risk metrics are marginal');
  return { recommendation: 'skip', warnings };
}

/**
 * Calculate position size for multiple concurrent bets (portfolio Kelly)
 */
export function calculatePortfolioKelly(
  bankroll: number,
  positions: Array<{
    odds: number;
    winProbability: number;
    correlation?: number;  // Correlation with other bets (0-1)
  }>,
  riskTolerance: 'aggressive' | 'moderate' | 'conservative'
): PositionSize[] {
  
  // For uncorrelated bets, calculate each independently
  // For correlated bets, reduce position sizes proportionally
  
  const results: PositionSize[] = [];
  let totalExposure = 0;
  
  for (const position of positions) {
    const availableBankroll = bankroll - totalExposure;
    
    const edge = position.winProbability - position.odds;
    const positionSize = calculateAdvancedKelly({
      bankroll: availableBankroll,
      odds: position.odds,
      edge,
      winProbability: position.winProbability,
      riskTolerance,
      currentExposure: totalExposure,
    });
    
    // Reduce position size if correlated with existing positions
    if (position.correlation && position.correlation > 0.3) {
      const correlationFactor = 1 - (position.correlation * 0.5);
      positionSize.positionAmount *= correlationFactor;
      positionSize.positionShares *= correlationFactor;
    }
    
    results.push(positionSize);
    totalExposure += positionSize.positionAmount;
  }
  
  return results;
}

/**
 * Risk management helper: Calculate stop loss and take profit levels
 */
export function calculateRiskLevels(
  entryPrice: number,
  positionSize: number,
  targetReturn: number = 0.30,  // 30% default
  maxRisk: number = 0.15        // 15% default
): {
  stopLoss: number;
  takeProfit: number;
  maxLoss: number;
  maxGain: number;
  riskRewardRatio: number;
} {
  
  const stopLoss = Math.max(entryPrice * (1 - maxRisk), 0.01);
  const takeProfit = Math.min(entryPrice * (1 + targetReturn), 0.99);
  
  const maxLoss = positionSize * ((entryPrice - stopLoss) / entryPrice);
  const maxGain = (positionSize / entryPrice) * (takeProfit - entryPrice);
  
  const riskRewardRatio = maxGain / maxLoss;
  
  return {
    stopLoss: Math.round(stopLoss * 1000) / 1000,
    takeProfit: Math.round(takeProfit * 1000) / 1000,
    maxLoss: Math.round(maxLoss * 100) / 100,
    maxGain: Math.round(maxGain * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
  };
}
