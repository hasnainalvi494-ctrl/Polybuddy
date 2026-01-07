/**
 * Participation Structure Analyzer
 *
 * Analyzes market participation patterns to compute Setup Quality and Participant Quality scores.
 *
 * IMPORTANT GUARDRAILS:
 * - NO predictions about outcomes
 * - NO wallet names or identifiers
 * - All language describes historical behavior patterns, not future outcomes
 * - Scores represent structural characteristics, not win probabilities
 */

import {
  MarketParticipationInput,
  ParticipationStructureResult,
  SetupQualityBand,
  ParticipantQualityBand,
  ParticipationSummary,
  SetupQualityDisplayInfo,
  ParticipantQualityDisplayInfo,
} from "./types.js";

// Behavior insights - describe patterns, NOT outcomes
const BEHAVIOR_INSIGHTS: Record<ParticipationSummary, Record<SetupQualityBand, string>> = {
  few_dominant: {
    historically_favorable: "Concentrated markets with stable liquidity have historically shown orderly price discovery.",
    mixed_workable: "Markets with dominant participants can reprice quickly when new information arrives.",
    neutral: "Concentration patterns in this market are typical for its category.",
    historically_unforgiving: "Markets with few large participants historically show wider spreads and less predictable fills.",
  },
  mixed_participation: {
    historically_favorable: "Balanced participation has historically supported stable trading conditions.",
    mixed_workable: "Mixed participation typically provides adequate liquidity for moderate-sized orders.",
    neutral: "Participation structure is unremarkable for this market type.",
    historically_unforgiving: "Mixed structures with low liquidity have historically shown execution challenges.",
  },
  broad_retail: {
    historically_favorable: "Broad participation has historically provided deep liquidity and tight spreads.",
    mixed_workable: "Retail-heavy markets can experience volume-driven price moves.",
    neutral: "Participation breadth is typical for retail-accessible markets.",
    historically_unforgiving: "Retail-dominated markets with low quality metrics have historically shown choppy price action.",
  },
};

/**
 * Compute Setup Quality Score (0-100)
 *
 * Evaluates market structure based on:
 * - Liquidity stability
 * - Spread consistency
 * - Volume patterns
 * - Depth availability
 *
 * NOT a win probability - represents how the market structure has historically behaved
 */
function computeSetupQualityScore(input: MarketParticipationInput): number {
  let score = 50; // Start neutral

  // Liquidity factor (0-25 points)
  if (input.liquidity !== null && input.liquidity > 0) {
    if (input.liquidity > 100000) score += 25;
    else if (input.liquidity > 50000) score += 20;
    else if (input.liquidity > 20000) score += 15;
    else if (input.liquidity > 5000) score += 10;
    else score += 5;
  }

  // Spread factor (-15 to +15 points)
  if (input.spread !== null) {
    if (input.spread < 0.01) score += 15;
    else if (input.spread < 0.02) score += 10;
    else if (input.spread < 0.05) score += 5;
    else if (input.spread > 0.1) score -= 15;
    else if (input.spread > 0.05) score -= 5;
  }

  // Volume consistency factor (0-15 points)
  if (input.volumeConsistency !== undefined) {
    score += Math.floor(input.volumeConsistency * 0.15);
  } else if (input.volume24h !== null && input.volume24h > 0) {
    // Estimate from volume
    if (input.volume24h > 50000) score += 15;
    else if (input.volume24h > 10000) score += 10;
    else if (input.volume24h > 1000) score += 5;
  }

  // Liquidity stability factor (0-15 points)
  if (input.liquidityStability !== undefined) {
    score += Math.floor(input.liquidityStability * 0.15);
  }

  // Depth factor (0-10 points)
  if (input.depth !== null && input.depth > 0) {
    if (input.depth > 50000) score += 10;
    else if (input.depth > 20000) score += 7;
    else if (input.depth > 5000) score += 4;
  }

  // Price stability factor (-10 to +10)
  if (input.priceStability !== undefined) {
    score += Math.floor((input.priceStability - 50) * 0.2);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute Participant Quality Score (0-100)
 *
 * Evaluates presence of experienced participants based on:
 * - Trade size distribution
 * - Trader concentration
 * - Volume patterns
 *
 * NOT about "smart money" - represents historical activity patterns
 */
function computeParticipantQualityScore(input: MarketParticipationInput): number {
  let score = 50; // Start neutral

  // Large trader volume contribution (0-25 points)
  if (input.largeTraderVolumePct !== undefined) {
    // Higher large trader % suggests more experienced participants
    score += Math.floor(input.largeTraderVolumePct * 0.25);
  } else if (input.avgTradeSize !== undefined) {
    // Estimate from average trade size
    if (input.avgTradeSize > 1000) score += 25;
    else if (input.avgTradeSize > 500) score += 20;
    else if (input.avgTradeSize > 100) score += 10;
  }

  // Unique traders factor (0-15 points)
  // More traders generally means more diverse opinions
  if (input.uniqueTraders !== undefined) {
    if (input.uniqueTraders > 100) score += 15;
    else if (input.uniqueTraders > 50) score += 10;
    else if (input.uniqueTraders > 20) score += 5;
  }

  // Large trade count (0-15 points)
  if (input.largeTradeCount !== undefined && input.totalTradeCount !== undefined && input.totalTradeCount > 0) {
    const largeRatio = input.largeTradeCount / input.totalTradeCount;
    score += Math.floor(largeRatio * 15);
  }

  // Volume suggests activity (0-10 points)
  if (input.volume24h !== null && input.volume24h > 0) {
    if (input.volume24h > 100000) score += 10;
    else if (input.volume24h > 25000) score += 7;
    else if (input.volume24h > 5000) score += 4;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Classify Setup Quality into bands
 */
function classifySetupQuality(score: number): SetupQualityBand {
  if (score >= 80) return "historically_favorable";
  if (score >= 60) return "mixed_workable";
  if (score >= 40) return "neutral";
  return "historically_unforgiving";
}

/**
 * Classify Participant Quality into bands
 */
function classifyParticipantQuality(score: number): ParticipantQualityBand {
  if (score >= 70) return "strong";
  if (score >= 45) return "moderate";
  return "limited";
}

/**
 * Compute participation breakdown percentages
 */
function computeBreakdown(input: MarketParticipationInput): {
  largePct: number;
  midPct: number;
  smallPct: number;
  summary: ParticipationSummary;
} {
  // Use provided percentages if available
  if (
    input.largeTraderVolumePct !== undefined &&
    input.midTraderVolumePct !== undefined &&
    input.smallTraderVolumePct !== undefined
  ) {
    const large = Math.round(input.largeTraderVolumePct);
    const mid = Math.round(input.midTraderVolumePct);
    const small = Math.round(input.smallTraderVolumePct);

    // Normalize to 100%
    const total = large + mid + small;
    const normalize = (v: number) => total > 0 ? Math.round((v / total) * 100) : 33;

    const breakdown = {
      largePct: normalize(large),
      midPct: normalize(mid),
      smallPct: normalize(small),
    };

    // Fix rounding to ensure we hit 100%
    const sum = breakdown.largePct + breakdown.midPct + breakdown.smallPct;
    if (sum !== 100) {
      breakdown.smallPct += (100 - sum);
    }

    return {
      ...breakdown,
      summary: classifyParticipationSummary(breakdown.largePct, breakdown.midPct, breakdown.smallPct),
    };
  }

  // Estimate from available metrics
  let largePct = 30;
  let midPct = 40;
  let smallPct = 30;

  // Adjust based on average trade size
  if (input.avgTradeSize !== undefined) {
    if (input.avgTradeSize > 500) {
      largePct = 50;
      midPct = 35;
      smallPct = 15;
    } else if (input.avgTradeSize < 50) {
      largePct = 10;
      midPct = 30;
      smallPct = 60;
    }
  }

  // Adjust based on unique traders
  if (input.uniqueTraders !== undefined) {
    if (input.uniqueTraders < 10) {
      largePct = Math.min(70, largePct + 20);
      smallPct = Math.max(10, smallPct - 20);
    } else if (input.uniqueTraders > 100) {
      largePct = Math.max(10, largePct - 15);
      smallPct = Math.min(70, smallPct + 15);
    }
  }

  // Normalize
  const total = largePct + midPct + smallPct;
  largePct = Math.round((largePct / total) * 100);
  midPct = Math.round((midPct / total) * 100);
  smallPct = 100 - largePct - midPct;

  return {
    largePct,
    midPct,
    smallPct,
    summary: classifyParticipationSummary(largePct, midPct, smallPct),
  };
}

/**
 * Classify participation summary from breakdown
 */
function classifyParticipationSummary(
  largePct: number,
  midPct: number,
  smallPct: number
): ParticipationSummary {
  if (largePct >= 50) return "few_dominant";
  if (smallPct >= 50) return "broad_retail";
  return "mixed_participation";
}

/**
 * Analyze participation structure for a market side
 *
 * Returns structural analysis without predictions
 */
export function analyzeParticipationStructure(
  input: MarketParticipationInput
): ParticipationStructureResult {
  // Compute scores
  const setupQualityScore = computeSetupQualityScore(input);
  const participantQualityScore = computeParticipantQualityScore(input);

  // Classify into bands
  const setupQualityBand = classifySetupQuality(setupQualityScore);
  const participantQualityBand = classifyParticipantQuality(participantQualityScore);

  // Compute breakdown
  const breakdown = computeBreakdown(input);

  // Generate behavior insight (no predictions)
  const behaviorInsight = BEHAVIOR_INSIGHTS[breakdown.summary][setupQualityBand];

  return {
    marketId: input.marketId,
    side: input.side,
    setupQualityScore,
    setupQualityBand,
    participantQualityScore,
    participantQualityBand,
    participationSummary: breakdown.summary,
    breakdown: {
      largePct: breakdown.largePct,
      midPct: breakdown.midPct,
      smallPct: breakdown.smallPct,
    },
    behaviorInsight,
    computedAt: new Date(),
  };
}

/**
 * Get display info for Setup Quality band
 */
export function getSetupQualityDisplayInfo(band: SetupQualityBand): SetupQualityDisplayInfo {
  const info: Record<SetupQualityBand, SetupQualityDisplayInfo> = {
    historically_favorable: {
      band: "historically_favorable",
      label: "Historically Favorable",
      description: "Markets with similar structure have historically shown orderly trading conditions.",
      color: "emerald",
    },
    mixed_workable: {
      band: "mixed_workable",
      label: "Mixed but Workable",
      description: "Structure has shown mixed historical behavior but generally supports trading.",
      color: "yellow",
    },
    neutral: {
      band: "neutral",
      label: "Neutral Structure",
      description: "Typical structure with no strong historical patterns.",
      color: "gray",
    },
    historically_unforgiving: {
      band: "historically_unforgiving",
      label: "Historically Challenging",
      description: "Markets with similar structure have historically shown challenging conditions.",
      color: "red",
    },
  };

  return info[band];
}

/**
 * Get display info for Participant Quality band
 */
export function getParticipantQualityDisplayInfo(band: ParticipantQualityBand): ParticipantQualityDisplayInfo {
  const info: Record<ParticipantQualityBand, ParticipantQualityDisplayInfo> = {
    strong: {
      band: "strong",
      label: "Strong Participation",
      description: "Significant activity from experienced participants.",
      color: "emerald",
    },
    moderate: {
      band: "moderate",
      label: "Moderate Participation",
      description: "Mix of participant experience levels.",
      color: "yellow",
    },
    limited: {
      band: "limited",
      label: "Limited Participation",
      description: "Few experienced participants active on this side.",
      color: "gray",
    },
  };

  return info[band];
}
