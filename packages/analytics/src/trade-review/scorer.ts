import {
  TradeInput,
  TradeContext,
  TradeReviewResult,
  TradeReviewLabel,
  TradeReviewThresholds,
  DEFAULT_TRADE_THRESHOLDS,
  REVIEW_DISPLAY_LABELS,
} from "./types.js";
import { WhyBullet, MarketStateLabel } from "../market-state/types.js";

/**
 * Trade Review Scorer
 *
 * Evaluates trade execution quality based on market conditions at entry time.
 * Focus is on PROCESS quality, not outcome prediction.
 * Each review includes exactly 3 "why" bullets with numeric evidence.
 */

interface ScoreComponent {
  points: number;
  maxPoints: number;
  reason?: WhyBullet;
}

/**
 * Score a single trade's execution quality
 */
export function scoreTradeExecution(
  trade: TradeInput,
  context: TradeContext,
  thresholds: TradeReviewThresholds = DEFAULT_TRADE_THRESHOLDS
): TradeReviewResult {
  const components: ScoreComponent[] = [];

  // 1. Spread quality at entry
  components.push(scoreSpread(context, thresholds));

  // 2. Depth/liquidity at entry
  components.push(scoreDepth(context, thresholds));

  // 3. Chasing detection (was price moving before entry?)
  components.push(scoreChasingBehavior(trade, context, thresholds));

  // 4. Market state quality
  components.push(scoreMarketState(context));

  // 5. Compare to user's historical performance
  components.push(scoreVsUserMedian(context, thresholds));

  // Calculate total score
  const totalPoints = components.reduce((sum, c) => sum + c.points, 0);
  const maxPoints = components.reduce((sum, c) => sum + c.maxPoints, 0);
  const score = Math.round((totalPoints / maxPoints) * 100);

  // Collect reasons with scores
  const reasons = components
    .filter((c) => c.reason)
    .map((c) => c.reason!)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // Most significant first

  // Determine label
  const label = scoreToLabel(score, context);

  // Ensure exactly 3 why bullets
  const whyBullets = padOrTrimWhyBullets(reasons);

  // Confidence based on data completeness
  const dataPoints = [
    context.spreadAtEntry,
    context.depthAtEntry,
    context.priceChange15m,
    context.marketState,
  ].filter((x) => x !== null).length;
  const confidence = Math.round((dataPoints / 4) * 100);

  return {
    walletId: trade.walletId,
    marketId: trade.marketId,
    tradeTs: trade.tradeTs,
    side: trade.side,
    notional: trade.notional,
    score,
    confidence,
    label,
    displayLabel: REVIEW_DISPLAY_LABELS[label],
    whyBullets,
    metrics: {
      spreadAtEntry: context.spreadAtEntry,
      depthAtEntry: context.depthAtEntry,
      priceChange15m: context.priceChange15m,
      marketState: context.marketState,
    },
    computedAt: new Date(),
  };
}

function scoreSpread(
  context: TradeContext,
  thresholds: TradeReviewThresholds
): ScoreComponent {
  if (context.spreadAtEntry === null) {
    return { points: 10, maxPoints: 20 }; // Neutral if no data
  }

  const spreadPct = context.spreadAtEntry * 100;

  if (context.spreadAtEntry < thresholds.spreadGood) {
    return {
      points: 20,
      maxPoints: 20,
      reason: {
        text: "Spread was tight at entry",
        metric: "Spread at entry",
        value: Number(spreadPct.toFixed(2)),
        unit: "%",
        comparison: context.userMedianSpread
          ? `vs ${(context.userMedianSpread * 100).toFixed(2)}% your median`
          : undefined,
      },
    };
  } else if (context.spreadAtEntry > thresholds.spreadBad) {
    return {
      points: 0,
      maxPoints: 20,
      reason: {
        text: "Wide spread increased execution cost",
        metric: "Spread at entry",
        value: Number(spreadPct.toFixed(2)),
        unit: "%",
        comparison: `>${(thresholds.spreadBad * 100).toFixed(0)}% threshold`,
      },
    };
  }

  return {
    points: 10,
    maxPoints: 20,
    reason: {
      text: "Spread was moderate at entry",
      metric: "Spread at entry",
      value: Number(spreadPct.toFixed(2)),
      unit: "%",
    },
  };
}

function scoreDepth(
  context: TradeContext,
  thresholds: TradeReviewThresholds
): ScoreComponent {
  if (context.depthAtEntry === null) {
    return { points: 10, maxPoints: 20 };
  }

  if (context.depthAtEntry > thresholds.depthGood) {
    return {
      points: 20,
      maxPoints: 20,
      reason: {
        text: "Deep liquidity supported execution",
        metric: "Depth at entry",
        value: Math.round(context.depthAtEntry),
        unit: "USD",
      },
    };
  } else if (context.depthAtEntry < thresholds.depthBad) {
    return {
      points: 0,
      maxPoints: 20,
      reason: {
        text: "Thin liquidity may have caused slippage",
        metric: "Depth at entry",
        value: Math.round(context.depthAtEntry),
        unit: "USD",
        comparison: `<$${thresholds.depthBad.toLocaleString()} threshold`,
      },
    };
  }

  return {
    points: 10,
    maxPoints: 20,
    reason: {
      text: "Adequate liquidity at entry",
      metric: "Depth at entry",
      value: Math.round(context.depthAtEntry),
      unit: "USD",
    },
  };
}

function scoreChasingBehavior(
  trade: TradeInput,
  context: TradeContext,
  thresholds: TradeReviewThresholds
): ScoreComponent {
  if (context.priceChange15m === null) {
    return { points: 15, maxPoints: 30 };
  }

  const change = context.priceChange15m;
  const changePct = change * 100;

  // Check if chasing (price moved in trade direction before entry)
  const isChasing =
    (trade.side === "buy" && change > thresholds.chasingThreshold) ||
    (trade.side === "sell" && change < -thresholds.chasingThreshold);

  // Check if adverse (price moved against before entry - could be good timing or catching knife)
  const isAdverse =
    (trade.side === "buy" && change < thresholds.adverseThreshold) ||
    (trade.side === "sell" && change > -thresholds.adverseThreshold);

  if (isChasing) {
    return {
      points: 0,
      maxPoints: 30,
      reason: {
        text: `Bought after ${Math.abs(changePct).toFixed(1)}% ${trade.side === "buy" ? "rise" : "fall"} - potential chase`,
        metric: "Price change before entry",
        value: Number(changePct.toFixed(2)),
        unit: "%",
        comparison: "in last 15 min",
      },
    };
  }

  if (Math.abs(change) < 0.005) {
    return {
      points: 30,
      maxPoints: 30,
      reason: {
        text: "Price was stable before entry",
        metric: "Price change before entry",
        value: Number(changePct.toFixed(2)),
        unit: "%",
        comparison: "in last 15 min",
      },
    };
  }

  // Mild movement - neutral
  return {
    points: 20,
    maxPoints: 30,
    reason: {
      text: `Price moved ${Math.abs(changePct).toFixed(1)}% before entry`,
      metric: "Price change before entry",
      value: Number(changePct.toFixed(2)),
      unit: "%",
      comparison: "in last 15 min",
    },
  };
}

function scoreMarketState(context: TradeContext): ScoreComponent {
  if (context.marketState === null) {
    return { points: 10, maxPoints: 20 };
  }

  const stateScores: Record<MarketStateLabel, number> = {
    calm_liquid: 20,
    thin_slippage: 5,
    jumpy: 10,
    event_driven: 5,
  };

  const points = stateScores[context.marketState];
  const stateLabels: Record<MarketStateLabel, string> = {
    calm_liquid: "Calm & Liquid",
    thin_slippage: "Thin market",
    jumpy: "Volatile market",
    event_driven: "Event-driven",
  };

  return {
    points,
    maxPoints: 20,
    reason: {
      text: `Market was "${stateLabels[context.marketState]}" at entry`,
      metric: "Market state",
      value: points,
      unit: "pts",
      comparison: "of 20 possible",
    },
  };
}

function scoreVsUserMedian(
  context: TradeContext,
  thresholds: TradeReviewThresholds
): ScoreComponent {
  if (context.userMedianSpread === null || context.spreadAtEntry === null) {
    return { points: 5, maxPoints: 10 };
  }

  const ratio = context.spreadAtEntry / context.userMedianSpread;

  if (ratio < 0.8) {
    return {
      points: 10,
      maxPoints: 10,
      reason: {
        text: "Better spread than your historical median",
        metric: "vs your median",
        value: Number(((1 - ratio) * 100).toFixed(0)),
        unit: "% better",
      },
    };
  } else if (ratio > 1.5) {
    return {
      points: 0,
      maxPoints: 10,
      reason: {
        text: "Worse spread than your historical median",
        metric: "vs your median",
        value: Number(((ratio - 1) * 100).toFixed(0)),
        unit: "% worse",
      },
    };
  }

  return { points: 5, maxPoints: 10 };
}

function scoreToLabel(score: number, context: TradeContext): TradeReviewLabel {
  // Check for explicit chasing
  if (context.priceChange15m !== null && Math.abs(context.priceChange15m) > 0.03) {
    return "poor_timing";
  }

  if (score >= 75) return "good_process";
  if (score >= 50) return "acceptable_process";
  if (score >= 30) return "risky_process";
  return "poor_timing";
}

function padOrTrimWhyBullets(reasons: WhyBullet[]): [WhyBullet, WhyBullet, WhyBullet] {
  const result = reasons.slice(0, 3);

  while (result.length < 3) {
    result.push({
      text: "Execution conditions within normal parameters",
      metric: "Status",
      value: 1,
      unit: "normal",
    });
  }

  return result as [WhyBullet, WhyBullet, WhyBullet];
}
