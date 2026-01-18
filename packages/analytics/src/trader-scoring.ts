/**
 * Elite Trader Identification System
 * 
 * Comprehensive trader scoring algorithm that analyzes wallet performance
 * across multiple metrics to identify elite traders and provide "Best Bets"
 * trading assistance.
 */

export interface TraderMetrics {
  // Basic Metrics
  totalProfit: number;
  totalVolume: number;
  winRate: number; // Percentage (0-100)
  tradeCount: number;
  roiPercent: number;
  
  // Elite Metrics
  profitFactor: number; // Gross Profit ÷ Gross Loss
  sharpeRatio: number; // Risk-adjusted returns
  maxDrawdown: number; // Maximum loss from peak (%)
  grossProfit: number;
  grossLoss: number;
  
  // Consistency Metrics
  consecutiveWins: number;
  longestWinStreak: number;
  avgHoldingTimeHours: number;
  marketTimingScore: number; // 0-100
  
  // Specialization
  primaryCategory?: string;
  categorySpecialization?: Record<string, number>;
}

export type TraderTier = "elite" | "strong" | "moderate" | "developing" | "limited";
export type RiskProfile = "conservative" | "moderate" | "aggressive";

export interface TraderScore {
  walletAddress: string;
  eliteScore: number; // 0-100 composite score
  traderTier: TraderTier;
  riskProfile: RiskProfile;
  
  // Breakdown scores
  performanceScore: number; // 0-40 points
  consistencyScore: number; // 0-30 points
  experienceScore: number; // 0-20 points
  riskScore: number; // 0-10 points
  
  // Rankings
  rank: number;
  eliteRank?: number; // Only for elite traders
  
  // Recommendations
  isRecommended: boolean;
  strengths: string[];
  warnings: string[];
}

/**
 * Elite Trader Thresholds
 */
export const ELITE_THRESHOLDS = {
  WIN_RATE: 80, // >80% for elite
  PROFIT_FACTOR: 2.5, // >2.5 for elite
  SHARPE_RATIO: 2.0, // >2.0 for elite
  MAX_DRAWDOWN: 15, // <15% for elite
  MIN_PROFIT: 10000, // >$10K for elite
  MIN_TRADES: 20, // Minimum trades for reliable scoring
};

/**
 * Calculate Performance Score (0-40 points)
 * 
 * Evaluates profitability and efficiency
 */
export function calculatePerformanceScore(metrics: TraderMetrics): number {
  let score = 0;
  
  // Win Rate (0-15 points)
  if (metrics.winRate >= 90) score += 15;
  else if (metrics.winRate >= 80) score += 12;
  else if (metrics.winRate >= 70) score += 9;
  else if (metrics.winRate >= 60) score += 6;
  else if (metrics.winRate >= 50) score += 3;
  
  // Profit Factor (0-15 points)
  if (metrics.profitFactor >= 4.0) score += 15;
  else if (metrics.profitFactor >= 3.0) score += 12;
  else if (metrics.profitFactor >= 2.5) score += 10;
  else if (metrics.profitFactor >= 2.0) score += 7;
  else if (metrics.profitFactor >= 1.5) score += 4;
  else if (metrics.profitFactor >= 1.0) score += 2;
  
  // Total Profit (0-10 points)
  if (metrics.totalProfit >= 100000) score += 10;
  else if (metrics.totalProfit >= 50000) score += 8;
  else if (metrics.totalProfit >= 25000) score += 6;
  else if (metrics.totalProfit >= 10000) score += 4;
  else if (metrics.totalProfit >= 5000) score += 2;
  else if (metrics.totalProfit >= 1000) score += 1;
  
  return Math.min(score, 40);
}

/**
 * Calculate Consistency Score (0-30 points)
 * 
 * Evaluates reliability and risk management
 */
export function calculateConsistencyScore(metrics: TraderMetrics): number {
  let score = 0;
  
  // Sharpe Ratio (0-12 points)
  if (metrics.sharpeRatio >= 3.0) score += 12;
  else if (metrics.sharpeRatio >= 2.5) score += 10;
  else if (metrics.sharpeRatio >= 2.0) score += 8;
  else if (metrics.sharpeRatio >= 1.5) score += 6;
  else if (metrics.sharpeRatio >= 1.0) score += 3;
  
  // Max Drawdown (0-10 points) - Lower is better
  if (metrics.maxDrawdown <= 5) score += 10;
  else if (metrics.maxDrawdown <= 10) score += 8;
  else if (metrics.maxDrawdown <= 15) score += 6;
  else if (metrics.maxDrawdown <= 20) score += 4;
  else if (metrics.maxDrawdown <= 30) score += 2;
  
  // Win Streak (0-8 points)
  if (metrics.longestWinStreak >= 10) score += 8;
  else if (metrics.longestWinStreak >= 7) score += 6;
  else if (metrics.longestWinStreak >= 5) score += 4;
  else if (metrics.longestWinStreak >= 3) score += 2;
  
  return Math.min(score, 30);
}

/**
 * Calculate Experience Score (0-20 points)
 * 
 * Evaluates trading history and market timing
 */
export function calculateExperienceScore(metrics: TraderMetrics): number {
  let score = 0;
  
  // Trade Count (0-10 points)
  if (metrics.tradeCount >= 200) score += 10;
  else if (metrics.tradeCount >= 100) score += 8;
  else if (metrics.tradeCount >= 50) score += 6;
  else if (metrics.tradeCount >= 25) score += 4;
  else if (metrics.tradeCount >= 10) score += 2;
  
  // Market Timing Score (0-10 points)
  score += Math.round((metrics.marketTimingScore / 100) * 10);
  
  return Math.min(score, 20);
}

/**
 * Calculate Risk Score (0-10 points)
 * 
 * Evaluates risk management and position sizing
 */
export function calculateRiskScore(metrics: TraderMetrics): number {
  let score = 0;
  
  // ROI Stability (0-5 points)
  if (metrics.roiPercent >= 50 && metrics.roiPercent <= 200) score += 5; // Balanced returns
  else if (metrics.roiPercent >= 30) score += 3;
  else if (metrics.roiPercent >= 10) score += 1;
  
  // Volume/Profit Ratio (0-5 points)
  const volumeEfficiency = metrics.totalProfit / metrics.totalVolume;
  if (volumeEfficiency >= 0.3) score += 5; // 30%+ profit on volume
  else if (volumeEfficiency >= 0.2) score += 4;
  else if (volumeEfficiency >= 0.15) score += 3;
  else if (volumeEfficiency >= 0.1) score += 2;
  else if (volumeEfficiency >= 0.05) score += 1;
  
  return Math.min(score, 10);
}

/**
 * Determine Trader Tier based on Elite Score
 */
export function determineTraderTier(eliteScore: number): TraderTier {
  if (eliteScore >= 80) return "elite";
  if (eliteScore >= 60) return "strong";
  if (eliteScore >= 40) return "moderate";
  if (eliteScore >= 20) return "developing";
  return "limited";
}

/**
 * Determine Risk Profile based on trading patterns
 */
export function determineRiskProfile(metrics: TraderMetrics): RiskProfile {
  const avgTradeSize = metrics.totalVolume / metrics.tradeCount;
  const volatilityScore = metrics.maxDrawdown * (1 - metrics.winRate / 100);
  
  if (volatilityScore < 10 && avgTradeSize < 1000) {
    return "conservative";
  } else if (volatilityScore > 25 || avgTradeSize > 5000) {
    return "aggressive";
  }
  return "moderate";
}

/**
 * Generate strengths description
 */
export function identifyStrengths(metrics: TraderMetrics, scores: any): string[] {
  const strengths: string[] = [];
  
  if (metrics.winRate >= 80) strengths.push("Exceptional win rate");
  if (metrics.profitFactor >= 3.0) strengths.push("Outstanding profit factor");
  if (metrics.sharpeRatio >= 2.0) strengths.push("Excellent risk-adjusted returns");
  if (metrics.maxDrawdown <= 15) strengths.push("Strong risk management");
  if (metrics.longestWinStreak >= 7) strengths.push("Consistent winning streaks");
  if (metrics.marketTimingScore >= 75) strengths.push("Great market timing");
  if (metrics.tradeCount >= 100) strengths.push("Experienced trader");
  
  return strengths;
}

/**
 * Generate warnings
 */
export function identifyWarnings(metrics: TraderMetrics): string[] {
  const warnings: string[] = [];
  
  if (metrics.tradeCount < ELITE_THRESHOLDS.MIN_TRADES) {
    warnings.push("Limited trade history - score may be unreliable");
  }
  if (metrics.maxDrawdown > 30) {
    warnings.push("High drawdown risk");
  }
  if (metrics.winRate < 50) {
    warnings.push("Below 50% win rate");
  }
  if (metrics.profitFactor < 1.0) {
    warnings.push("Losing more than winning");
  }
  
  return warnings;
}

/**
 * Main function: Calculate comprehensive trader score
 * 
 * @param metrics - Trader performance metrics
 * @returns TraderScore with tier classification and recommendations
 */
export function calculateTraderScore(
  walletAddress: string,
  metrics: TraderMetrics
): TraderScore {
  // Calculate component scores
  const performanceScore = calculatePerformanceScore(metrics);
  const consistencyScore = calculateConsistencyScore(metrics);
  const experienceScore = calculateExperienceScore(metrics);
  const riskScore = calculateRiskScore(metrics);
  
  // Calculate total elite score (0-100)
  const eliteScore = performanceScore + consistencyScore + experienceScore + riskScore;
  
  // Determine classifications
  const traderTier = determineTraderTier(eliteScore);
  const riskProfile = determineRiskProfile(metrics);
  
  // Check if recommended
  const isRecommended = 
    traderTier === "elite" &&
    metrics.totalProfit >= ELITE_THRESHOLDS.MIN_PROFIT &&
    metrics.winRate >= ELITE_THRESHOLDS.WIN_RATE &&
    metrics.tradeCount >= ELITE_THRESHOLDS.MIN_TRADES;
  
  // Generate insights
  const strengths = identifyStrengths(metrics, { performanceScore, consistencyScore });
  const warnings = identifyWarnings(metrics);
  
  return {
    walletAddress,
    eliteScore,
    traderTier,
    riskProfile,
    performanceScore,
    consistencyScore,
    experienceScore,
    riskScore,
    rank: 0, // Will be set by ranking function
    isRecommended,
    strengths,
    warnings,
  };
}

/**
 * Check if a trader meets elite criteria
 */
export function isEliteTrader(metrics: TraderMetrics): boolean {
  return (
    metrics.winRate >= ELITE_THRESHOLDS.WIN_RATE &&
    metrics.profitFactor >= ELITE_THRESHOLDS.PROFIT_FACTOR &&
    metrics.sharpeRatio >= ELITE_THRESHOLDS.SHARPE_RATIO &&
    metrics.maxDrawdown <= ELITE_THRESHOLDS.MAX_DRAWDOWN &&
    metrics.totalProfit >= ELITE_THRESHOLDS.MIN_PROFIT &&
    metrics.tradeCount >= ELITE_THRESHOLDS.MIN_TRADES
  );
}

/**
 * Get "Best Bets" - Markets where elite traders are currently active
 */
export interface BestBet {
  marketId: string;
  marketQuestion: string;
  eliteTraderCount: number;
  avgEliteScore: number;
  totalEliteVolume: number;
  eliteConsensus: "bullish" | "bearish" | "mixed";
  topTraders: Array<{
    address: string;
    eliteScore: number;
    position: "yes" | "no";
    confidence: number;
  }>;
  recommendationStrength: "strong" | "moderate" | "weak";
}

/**
 * Calculate recommendation strength based on elite trader activity
 */
export function calculateRecommendationStrength(
  eliteTraderCount: number,
  avgEliteScore: number,
  consensusPercentage: number
): "strong" | "moderate" | "weak" {
  if (
    eliteTraderCount >= 5 &&
    avgEliteScore >= 85 &&
    consensusPercentage >= 80
  ) {
    return "strong";
  } else if (
    eliteTraderCount >= 3 &&
    avgEliteScore >= 75 &&
    consensusPercentage >= 70
  ) {
    return "moderate";
  }
  return "weak";
}
