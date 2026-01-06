import { z } from "zod";
import { WhyBulletSchema } from "../market-state/types.js";

/**
 * Flow Type Classification Types
 *
 * Builds flow episodes from wallet trades (sessionized by time gap).
 * Labels each episode by pattern type to help identify meaningful vs noise flows.
 */

// Flow episode labels
export const FlowLabelSchema = z.enum([
  "one_off_spike",        // Single large trade, likely news-driven
  "sustained_accumulation", // Repeated adds over time, conviction
  "crowd_chase",          // Many wallets following momentum
  "exhaustion_move",      // Late-stage crowding, potential reversal
]);
export type FlowLabel = z.infer<typeof FlowLabelSchema>;

// Human-readable labels
export const FLOW_DISPLAY_LABELS: Record<FlowLabel, string> = {
  one_off_spike: "One-off Spike",
  sustained_accumulation: "Sustained Accumulation",
  crowd_chase: "Crowd Chase",
  exhaustion_move: "Exhaustion Move",
};

// Individual trade input
export const TradeEventSchema = z.object({
  tradeId: z.string(),
  walletId: z.string(),
  marketId: z.string().uuid(),
  timestamp: z.date(),
  side: z.enum(["buy", "sell"]),
  outcome: z.enum(["yes", "no"]),
  size: z.number(), // USD value
  price: z.number(), // 0-1
});
export type TradeEvent = z.infer<typeof TradeEventSchema>;

// Flow episode (group of related trades)
export const FlowEpisodeSchema = z.object({
  episodeId: z.string(),
  marketId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date(),
  durationMinutes: z.number(),
  trades: z.array(TradeEventSchema),
  netFlow: z.number(), // Positive = net buying, negative = net selling
  totalVolume: z.number(),
  uniqueWallets: z.number(),
  avgTradeSize: z.number(),
  priceAtStart: z.number(),
  priceAtEnd: z.number(),
  priceChange: z.number(), // Percentage change
});
export type FlowEpisode = z.infer<typeof FlowEpisodeSchema>;

// Flow label result
export const FlowLabelResultSchema = z.object({
  episodeId: z.string(),
  marketId: z.string().uuid(),
  label: FlowLabelSchema,
  displayLabel: z.string(),
  confidence: z.number().min(0).max(100),
  whyBullets: z.array(WhyBulletSchema).length(3),
  episode: FlowEpisodeSchema,
  priceImpact: z.number(), // How much price moved during episode
  followUpPriceChange: z.number().nullable(), // Price change after episode (if available)
  computedAt: z.date(),
});
export type FlowLabelResult = z.infer<typeof FlowLabelResultSchema>;

// Configuration thresholds
export interface FlowThresholds {
  // Episode detection
  sessionGapMinutes: number;     // Gap to split episodes
  minTradesForEpisode: number;   // Minimum trades to form episode

  // Label classification
  spikeMinSize: number;          // USD threshold for spike
  accumulationMinTrades: number; // Minimum trades for accumulation
  crowdMinWallets: number;       // Minimum unique wallets for crowd
  exhaustionPriceThreshold: number; // Price level suggesting exhaustion (e.g., 0.9)

  // Timing
  followUpWindowMinutes: number; // How long to wait for follow-up price
}

export const DEFAULT_FLOW_THRESHOLDS: FlowThresholds = {
  sessionGapMinutes: 30,
  minTradesForEpisode: 2,
  spikeMinSize: 10000,
  accumulationMinTrades: 5,
  crowdMinWallets: 5,
  exhaustionPriceThreshold: 0.85,
  followUpWindowMinutes: 60,
};

// Market flow summary
export const MarketFlowSummarySchema = z.object({
  marketId: z.string().uuid(),
  recentEpisodes: z.array(FlowLabelResultSchema),
  dominantFlowType: FlowLabelSchema.nullable(),
  netFlowDirection: z.enum(["buying", "selling", "neutral"]),
  flowIntensity: z.number().min(0).max(100), // How active the flow is
  computedAt: z.date(),
});
export type MarketFlowSummary = z.infer<typeof MarketFlowSummarySchema>;
