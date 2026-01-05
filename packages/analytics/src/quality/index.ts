import type { MarketQualityInput, MarketQualityResult, QualityGrade } from "../types.js";

// Scoring weights
const WEIGHTS = {
  spread: 0.25,
  depth: 0.20,
  volume: 0.20,
  staleness: 0.20,
  clarity: 0.15,
} as const;

// Thresholds for scoring (adjust based on Polymarket norms)
const THRESHOLDS = {
  spread: { excellent: 0.01, good: 0.03, fair: 0.05, poor: 0.10 },
  depth: { excellent: 50000, good: 10000, fair: 1000, poor: 100 },
  volume24h: { excellent: 100000, good: 10000, fair: 1000, poor: 100 },
  staleness: { excellent: 1, good: 6, fair: 24, poor: 72 }, // hours
};

function scoreSpread(spread: number): number {
  if (spread <= THRESHOLDS.spread.excellent) return 100;
  if (spread <= THRESHOLDS.spread.good) return 80;
  if (spread <= THRESHOLDS.spread.fair) return 60;
  if (spread <= THRESHOLDS.spread.poor) return 40;
  return 20;
}

function scoreDepth(depth: number): number {
  if (depth >= THRESHOLDS.depth.excellent) return 100;
  if (depth >= THRESHOLDS.depth.good) return 80;
  if (depth >= THRESHOLDS.depth.fair) return 60;
  if (depth >= THRESHOLDS.depth.poor) return 40;
  return 20;
}

function scoreVolume(volume: number): number {
  if (volume >= THRESHOLDS.volume24h.excellent) return 100;
  if (volume >= THRESHOLDS.volume24h.good) return 80;
  if (volume >= THRESHOLDS.volume24h.fair) return 60;
  if (volume >= THRESHOLDS.volume24h.poor) return 40;
  return 20;
}

function scoreStaleness(hours: number): number {
  if (hours <= THRESHOLDS.staleness.excellent) return 100;
  if (hours <= THRESHOLDS.staleness.good) return 80;
  if (hours <= THRESHOLDS.staleness.fair) return 60;
  if (hours <= THRESHOLDS.staleness.poor) return 40;
  return 20;
}

function scoreToGrade(score: number): QualityGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function calculateMarketQuality(input: MarketQualityInput): MarketQualityResult {
  const spreadScore = scoreSpread(input.spread);
  const depthScore = scoreDepth(input.depth);
  const volumeScore = scoreVolume(input.volume24h);
  const stalenessScore = scoreStaleness(input.staleness);
  const clarityScore = input.resolutionClarity * 100;

  const weightedScore =
    spreadScore * WEIGHTS.spread +
    depthScore * WEIGHTS.depth +
    volumeScore * WEIGHTS.volume +
    stalenessScore * WEIGHTS.staleness +
    clarityScore * WEIGHTS.clarity;

  return {
    grade: scoreToGrade(weightedScore),
    score: Math.round(weightedScore * 100) / 100,
    breakdown: {
      spreadScore,
      depthScore,
      volumeScore,
      stalenessScore,
      clarityScore,
    },
  };
}
