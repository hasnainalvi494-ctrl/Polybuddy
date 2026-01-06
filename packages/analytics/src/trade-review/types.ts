import { z } from "zod";
import { WhyBulletSchema, MarketStateLabelSchema } from "../market-state/types.js";

// Trade review labels (process quality, NOT outcome prediction)
export const TradeReviewLabelSchema = z.enum([
  "good_process",       // Trade executed under favorable conditions
  "acceptable_process", // Conditions were neutral
  "risky_process",      // Trade executed under poor conditions
  "poor_timing",        // Chased price or caught adverse movement
]);
export type TradeReviewLabel = z.infer<typeof TradeReviewLabelSchema>;

// Human-readable labels
export const REVIEW_DISPLAY_LABELS: Record<TradeReviewLabel, string> = {
  good_process: "Good Execution Conditions",
  acceptable_process: "Acceptable Conditions",
  risky_process: "Risky Execution Conditions",
  poor_timing: "Poor Timing",
};

// Trade input for review
export const TradeInputSchema = z.object({
  walletId: z.string().uuid(),
  marketId: z.string().uuid(),
  tradeTs: z.date(),
  side: z.enum(["buy", "sell"]),
  notional: z.number(),
  priceExecuted: z.number().optional(),
});
export type TradeInput = z.infer<typeof TradeInputSchema>;

// Market context at trade time
export const TradeContextSchema = z.object({
  spreadAtEntry: z.number().nullable(),
  depthAtEntry: z.number().nullable(),
  priceChange15m: z.number().nullable(), // Price change in 15m before trade
  priceChange5m: z.number().nullable(),  // Price change in 5m before trade
  marketState: MarketStateLabelSchema.nullable(),
  volumeRatio: z.number().nullable(), // Volume vs avg
  userMedianSpread: z.number().nullable(), // User's historical median spread
});
export type TradeContext = z.infer<typeof TradeContextSchema>;

// Trade review result
export const TradeReviewResultSchema = z.object({
  walletId: z.string().uuid(),
  marketId: z.string().uuid(),
  tradeTs: z.date(),
  side: z.string(),
  notional: z.number().nullable(),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  label: TradeReviewLabelSchema,
  displayLabel: z.string(),
  whyBullets: z.array(WhyBulletSchema).length(3),
  metrics: z.object({
    spreadAtEntry: z.number().nullable(),
    depthAtEntry: z.number().nullable(),
    priceChange15m: z.number().nullable(),
    marketState: MarketStateLabelSchema.nullable(),
  }),
  computedAt: z.date(),
});
export type TradeReviewResult = z.infer<typeof TradeReviewResultSchema>;

// Thresholds for trade review scoring
export interface TradeReviewThresholds {
  // Spread comparison
  spreadGood: number;      // Below this = good spread
  spreadBad: number;       // Above this = bad spread

  // Depth comparison
  depthGood: number;       // Above this = good depth
  depthBad: number;        // Below this = bad depth

  // Chasing detection (price change thresholds)
  chasingThreshold: number;    // Price moved this much in direction = chasing
  adverseThreshold: number;    // Price moved against = adverse

  // Slippage estimate
  expectedSlippageBps: number; // Expected slippage for comparison
}

export const DEFAULT_TRADE_THRESHOLDS: TradeReviewThresholds = {
  spreadGood: 0.02,        // 2%
  spreadBad: 0.05,         // 5%
  depthGood: 20000,        // $20K
  depthBad: 5000,          // $5K
  chasingThreshold: 0.03,  // 3% move
  adverseThreshold: -0.02, // 2% adverse
  expectedSlippageBps: 50, // 0.5%
};
