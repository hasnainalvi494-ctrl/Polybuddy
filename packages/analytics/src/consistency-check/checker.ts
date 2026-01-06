import {
  MarketPairInput,
  MarketRelationResult,
  ConsistencyCheckResult,
  ConsistencyLabel,
  RelationType,
  ConsistencyThresholds,
  DEFAULT_CONSISTENCY_THRESHOLDS,
  CONSISTENCY_DISPLAY_LABELS,
} from "./types.js";
import { WhyBullet } from "../market-state/types.js";

/**
 * Consistency Check Module
 *
 * Detects relationships between markets and checks for pricing inconsistencies.
 * Helps identify arbitrage opportunities or mispriced markets.
 */

/**
 * Detect potential relation between two markets
 */
export function detectRelation(
  pair: MarketPairInput,
  thresholds: ConsistencyThresholds = DEFAULT_CONSISTENCY_THRESHOLDS
): MarketRelationResult | null {
  // Calculate question similarity
  const similarity = calculateSimilarity(pair.aQuestion, pair.bQuestion);

  if (similarity < thresholds.similarityThreshold) {
    return null; // Not related
  }

  // Determine relation type
  const relationType = classifyRelation(pair, similarity, thresholds);

  if (!relationType) {
    return null;
  }

  return {
    aMarketId: pair.aMarketId,
    bMarketId: pair.bMarketId,
    relationType,
    similarity,
    relationMeta: {
      dateProximity: pair.aEndDate && pair.bEndDate
        ? Math.abs(pair.aEndDate.getTime() - pair.bEndDate.getTime()) / (1000 * 60 * 60 * 24)
        : null,
    },
  };
}

/**
 * Check consistency between related markets
 */
export function checkConsistency(
  pair: MarketPairInput,
  relation: MarketRelationResult,
  thresholds: ConsistencyThresholds = DEFAULT_CONSISTENCY_THRESHOLDS
): ConsistencyCheckResult {
  const reasons: WhyBullet[] = [];
  let score = 100; // Start at consistent

  switch (relation.relationType) {
    case "calendar_variant":
      ({ score, reasons: reasons.push(...checkCalendarConsistency(pair, thresholds).reasons) });
      score = checkCalendarConsistency(pair, thresholds).score;
      break;

    case "inverse":
      ({ score, reasons: reasons.push(...checkInverseConsistency(pair, thresholds).reasons) });
      score = checkInverseConsistency(pair, thresholds).score;
      break;

    case "multi_outcome":
      ({ score, reasons: reasons.push(...checkMultiOutcomeConsistency(pair, thresholds).reasons) });
      score = checkMultiOutcomeConsistency(pair, thresholds).score;
      break;

    case "correlated":
      ({ score, reasons: reasons.push(...checkCorrelationConsistency(pair).reasons) });
      score = checkCorrelationConsistency(pair).score;
      break;
  }

  // Determine label based on score
  const label = scoreToLabel(score);

  // Ensure exactly 3 why bullets
  const whyBullets = padWhyBullets(reasons, pair, score);

  // Confidence based on similarity
  const confidence = Math.round(relation.similarity * 100);

  return {
    aMarketId: pair.aMarketId,
    bMarketId: pair.bMarketId,
    aQuestion: pair.aQuestion,
    bQuestion: pair.bQuestion,
    relationType: relation.relationType,
    label,
    displayLabel: CONSISTENCY_DISPLAY_LABELS[label],
    score,
    confidence,
    whyBullets,
    priceA: pair.aPrice,
    priceB: pair.bPrice,
    computedAt: new Date(),
  };
}

/**
 * Calculate Jaccard similarity between questions
 */
function calculateSimilarity(q1: string, q2: string): number {
  const words1 = new Set(tokenize(q1));
  const words2 = new Set(tokenize(q2));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Tokenize a question for similarity calculation
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2) // Skip short words
    .filter((w) => !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "has", "have", "been", "will",
  "more", "when", "who", "oil", "its", "how", "man", "way", "day",
  "did", "get", "him", "his", "than", "been", "call", "first",
]);

/**
 * Classify the type of relation
 */
function classifyRelation(
  pair: MarketPairInput,
  similarity: number,
  thresholds: ConsistencyThresholds
): RelationType | null {
  // Check for calendar variant (same question, different dates)
  if (pair.aEndDate && pair.bEndDate) {
    const daysDiff = Math.abs(pair.aEndDate.getTime() - pair.bEndDate.getTime()) / (1000 * 60 * 60 * 24);
    if (similarity > 0.7 && daysDiff > 7 && daysDiff < thresholds.dateProximityDays) {
      return "calendar_variant";
    }
  }

  // Check for inverse (question contains "not" or opposite)
  const q1Lower = pair.aQuestion.toLowerCase();
  const q2Lower = pair.bQuestion.toLowerCase();
  if (
    (q1Lower.includes("will") && q2Lower.includes("won't")) ||
    (q1Lower.includes("yes") && q2Lower.includes("no")) ||
    similarity > 0.8
  ) {
    // Check if prices suggest inverse relationship
    const sumPrices = pair.aPrice + pair.bPrice;
    if (Math.abs(sumPrices - 1) < 0.3) {
      return "inverse";
    }
  }

  // Check for multi-outcome (same event, different outcomes)
  if (pair.aCategory === pair.bCategory && similarity > 0.5) {
    // E.g., "Will Trump win?" vs "Will Biden win?"
    return "multi_outcome";
  }

  // Fall back to correlated if similar enough
  if (similarity > thresholds.similarityThreshold) {
    return "correlated";
  }

  return null;
}

/**
 * Check calendar spread consistency
 */
function checkCalendarConsistency(
  pair: MarketPairInput,
  thresholds: ConsistencyThresholds
): { score: number; reasons: WhyBullet[] } {
  const reasons: WhyBullet[] = [];
  let score = 100;

  const spread = Math.abs(pair.aPrice - pair.bPrice);

  if (spread > thresholds.calendarSpread) {
    score -= Math.round((spread - thresholds.calendarSpread) * 200);
    reasons.push({
      text: "Unusual spread between date variants",
      metric: "Calendar spread",
      value: Number((spread * 100).toFixed(1)),
      unit: "%",
      comparison: `>${(thresholds.calendarSpread * 100).toFixed(0)}% expected`,
    });
  } else {
    reasons.push({
      text: "Calendar spread within normal range",
      metric: "Calendar spread",
      value: Number((spread * 100).toFixed(1)),
      unit: "%",
    });
  }

  // Check for inverted calendar (earlier date priced higher for events that should increase)
  if (pair.aEndDate && pair.bEndDate) {
    const aIsEarlier = pair.aEndDate < pair.bEndDate;
    const daysDiff = Math.abs(pair.aEndDate.getTime() - pair.bEndDate.getTime()) / (1000 * 60 * 60 * 24);

    reasons.push({
      text: `${Math.round(daysDiff)} days between resolution dates`,
      metric: "Date gap",
      value: Math.round(daysDiff),
      unit: "days",
    });
  }

  return { score: Math.max(0, score), reasons };
}

/**
 * Check inverse market consistency (should sum to ~1)
 */
function checkInverseConsistency(
  pair: MarketPairInput,
  thresholds: ConsistencyThresholds
): { score: number; reasons: WhyBullet[] } {
  const reasons: WhyBullet[] = [];
  let score = 100;

  const sum = pair.aPrice + pair.bPrice;
  const divergence = Math.abs(sum - 1);

  if (divergence > thresholds.invertedDivergence) {
    score -= Math.round(divergence * 300);
    reasons.push({
      text: "Inverse markets don't sum to 100%",
      metric: "Sum of prices",
      value: Number((sum * 100).toFixed(1)),
      unit: "%",
      comparison: "should be ~100%",
    });
  } else {
    reasons.push({
      text: "Inverse markets properly priced",
      metric: "Sum of prices",
      value: Number((sum * 100).toFixed(1)),
      unit: "%",
    });
  }

  reasons.push({
    text: `Price difference suggests ${(divergence * 100).toFixed(1)}% edge`,
    metric: "Potential edge",
    value: Number((divergence * 100).toFixed(2)),
    unit: "%",
  });

  return { score: Math.max(0, score), reasons };
}

/**
 * Check multi-outcome consistency
 */
function checkMultiOutcomeConsistency(
  pair: MarketPairInput,
  thresholds: ConsistencyThresholds
): { score: number; reasons: WhyBullet[] } {
  const reasons: WhyBullet[] = [];
  let score = 100;

  // Multi-outcome markets shouldn't have huge price gaps for similar events
  const priceDiff = Math.abs(pair.aPrice - pair.bPrice);

  if (priceDiff > 0.5) {
    score -= 20;
    reasons.push({
      text: "Large price difference between related outcomes",
      metric: "Price gap",
      value: Number((priceDiff * 100).toFixed(1)),
      unit: "%",
    });
  }

  reasons.push({
    text: "Related outcome comparison",
    metric: "Price A vs B",
    value: Number((pair.aPrice * 100).toFixed(0)),
    unit: `% vs ${(pair.bPrice * 100).toFixed(0)}%`,
  });

  return { score: Math.max(0, score), reasons };
}

/**
 * Check correlation consistency
 */
function checkCorrelationConsistency(pair: MarketPairInput): { score: number; reasons: WhyBullet[] } {
  const reasons: WhyBullet[] = [];
  const score = 80; // Default for correlated - no strong check

  reasons.push({
    text: "Markets appear correlated",
    metric: "Price A",
    value: Number((pair.aPrice * 100).toFixed(0)),
    unit: "%",
  });

  reasons.push({
    text: "Monitor for divergence",
    metric: "Price B",
    value: Number((pair.bPrice * 100).toFixed(0)),
    unit: "%",
  });

  return { score, reasons };
}

function scoreToLabel(score: number): ConsistencyLabel {
  if (score >= 80) return "looks_consistent";
  if (score >= 60) return "potential_inconsistency_low";
  if (score >= 40) return "potential_inconsistency_medium";
  return "potential_inconsistency_high";
}

function padWhyBullets(
  reasons: WhyBullet[],
  pair: MarketPairInput,
  score: number
): [WhyBullet, WhyBullet, WhyBullet] {
  const result = reasons.slice(0, 3);

  while (result.length < 3) {
    result.push({
      text: "Consistency score computed",
      metric: "Score",
      value: score,
      unit: "/ 100",
    });
  }

  return result as [WhyBullet, WhyBullet, WhyBullet];
}
