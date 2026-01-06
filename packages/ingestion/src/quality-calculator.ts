/**
 * Market Quality Score Calculator
 *
 * Calculates a composite quality grade (A-F) based on:
 * 1. Spread score (0-100): Lower spreads = better execution
 * 2. Depth score (0-100): Higher liquidity = less slippage
 * 3. Staleness score (0-100): More recent updates = fresher prices
 * 4. Volatility score (0-100): More stability = more predictable execution
 */

export interface QualityScores {
  spreadScore: number;
  depthScore: number;
  stalenessScore: number;
  volatilityScore: number;
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface QualityInput {
  spread: number | null;           // Bid-ask spread as decimal (e.g., 0.02 = 2%)
  liquidity: number | null;        // Liquidity in dollars
  lastUpdateMinutes: number | null; // Minutes since last price update
  priceHistory: number[];          // Array of recent prices for volatility calc
}

/**
 * Calculate spread score (0-100)
 * <2% spread = 100, >20% spread = 0
 */
function calculateSpreadScore(spread: number | null): number {
  if (spread === null || spread <= 0) return 50; // Default to middle if unknown

  const spreadPercent = spread * 100;

  if (spreadPercent <= 2) return 100;
  if (spreadPercent >= 20) return 0;

  // Linear interpolation between 2% and 20%
  return Math.round(100 - ((spreadPercent - 2) / 18) * 100);
}

/**
 * Calculate depth score (0-100) based on liquidity
 * $100K+ = 100, <$1K = 0
 */
function calculateDepthScore(liquidity: number | null): number {
  if (liquidity === null || liquidity <= 0) return 25; // Low default if unknown

  if (liquidity >= 100000) return 100;
  if (liquidity <= 1000) return 0;

  // Logarithmic scale for liquidity
  // log10(1000) = 3, log10(100000) = 5
  const logLiquidity = Math.log10(liquidity);
  const score = ((logLiquidity - 3) / 2) * 100;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate staleness score (0-100)
 * <5 min = 100, >24h = 0
 */
function calculateStalenessScore(lastUpdateMinutes: number | null): number {
  if (lastUpdateMinutes === null) return 50; // Default if unknown

  if (lastUpdateMinutes <= 5) return 100;
  if (lastUpdateMinutes >= 1440) return 0; // 24 hours

  // Logarithmic decay
  // 5 min = 100, 60 min = 50, 1440 min = 0
  const score = 100 - (Math.log(lastUpdateMinutes / 5) / Math.log(288)) * 100;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate volatility score (0-100)
 * Based on coefficient of variation of price history
 * <5% CV = 100, >50% CV = 0
 */
function calculateVolatilityScore(priceHistory: number[]): number {
  if (!priceHistory || priceHistory.length < 2) return 50; // Default if insufficient data

  // Filter out zeros and nulls
  const validPrices = priceHistory.filter(p => p > 0);
  if (validPrices.length < 2) return 50;

  // Calculate mean
  const mean = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  if (mean === 0) return 50;

  // Calculate standard deviation
  const variance = validPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / validPrices.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (CV) as percentage
  const cv = (stdDev / mean) * 100;

  if (cv <= 5) return 100;
  if (cv >= 50) return 0;

  // Linear interpolation
  return Math.round(100 - ((cv - 5) / 45) * 100);
}

/**
 * Convert overall score (0-100) to letter grade
 */
function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

/**
 * Calculate all quality scores
 */
export function calculateQualityScores(input: QualityInput): QualityScores {
  const spreadScore = calculateSpreadScore(input.spread);
  const depthScore = calculateDepthScore(input.liquidity);
  const stalenessScore = calculateStalenessScore(input.lastUpdateMinutes);
  const volatilityScore = calculateVolatilityScore(input.priceHistory);

  // Weighted average: spread and depth are most important for trading
  const overallScore = Math.round(
    spreadScore * 0.30 +
    depthScore * 0.35 +
    stalenessScore * 0.15 +
    volatilityScore * 0.20
  );

  return {
    spreadScore,
    depthScore,
    stalenessScore,
    volatilityScore,
    overallScore,
    grade: scoreToGrade(overallScore),
  };
}

/**
 * Generate a human-readable quality summary
 */
export function generateQualitySummary(
  scores: QualityScores,
  liquidity: number | null,
  spread: number | null
): string {
  const parts: string[] = [];

  // Spread assessment
  if (scores.spreadScore >= 80) {
    parts.push("tight spreads");
  } else if (scores.spreadScore >= 50) {
    parts.push("moderate spreads");
  } else {
    parts.push("wide spreads");
  }

  // Depth assessment
  if (scores.depthScore >= 80) {
    parts.push("deep liquidity");
  } else if (scores.depthScore >= 50) {
    parts.push("adequate liquidity");
  } else {
    parts.push("thin liquidity");
  }

  // Build the summary
  let summary = `This market has ${parts.join(" but ")}.`;

  // Add slippage estimate for a $500 trade
  if (liquidity && liquidity > 0 && spread !== null) {
    const tradeSize = 500;
    // Simple slippage model: spread cost + market impact
    const spreadCost = tradeSize * (spread / 2);
    const marketImpact = liquidity > 0 ? (tradeSize / liquidity) * tradeSize * 0.5 : 0;
    const totalSlippage = spreadCost + marketImpact;

    if (totalSlippage > 1) {
      summary += ` A $${tradeSize} trade would cost ~$${Math.round(totalSlippage)} in slippage.`;
    }
  }

  return summary;
}

/**
 * Check if market is low quality (D or F grade)
 */
export function isLowQuality(grade: "A" | "B" | "C" | "D" | "F"): boolean {
  return grade === "D" || grade === "F";
}
