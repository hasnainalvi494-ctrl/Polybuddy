import { z } from "zod";

// Quality grade schema
export const QualityGradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export type QualityGrade = z.infer<typeof QualityGradeSchema>;

// Market quality input schema
export const MarketQualityInputSchema = z.object({
  spread: z.number().min(0),
  depth: z.number().min(0),
  volume24h: z.number().min(0),
  staleness: z.number().min(0), // hours since last trade
  resolutionClarity: z.number().min(0).max(1), // 0-1 score
});
export type MarketQualityInput = z.infer<typeof MarketQualityInputSchema>;

// Market quality result
export const MarketQualityResultSchema = z.object({
  grade: QualityGradeSchema,
  score: z.number().min(0).max(100),
  breakdown: z.object({
    spreadScore: z.number(),
    depthScore: z.number(),
    volumeScore: z.number(),
    stalenessScore: z.number(),
    clarityScore: z.number(),
  }),
});
export type MarketQualityResult = z.infer<typeof MarketQualityResultSchema>;

// Clustering dimensions (5 behavior dimensions)
export const ClusteringDimensionsSchema = z.object({
  volatility: z.number(), // price movement frequency
  momentum: z.number(), // trending vs mean-reverting
  liquidityProfile: z.number(), // deep vs shallow
  timeHorizon: z.number(), // short vs long resolution
  eventSensitivity: z.number(), // reactive to external events
});
export type ClusteringDimensions = z.infer<typeof ClusteringDimensionsSchema>;

// Cluster labels (6 clusters)
export const ClusterLabelSchema = z.enum([
  "stable_liquid", // High liquidity, low volatility
  "volatile_speculative", // High volatility, event-driven
  "trending_momentum", // Strong directional movement
  "illiquid_niche", // Low liquidity, specialized
  "event_binary", // Binary outcome tied to specific event
  "long_horizon", // Long resolution time, gradual movement
]);
export type ClusterLabel = z.infer<typeof ClusterLabelSchema>;

// Performance metrics
export const PerformanceMetricsSchema = z.object({
  totalPnl: z.number(),
  realizedPnl: z.number(),
  unrealizedPnl: z.number(),
  totalTrades: z.number(),
  winRate: z.number().min(0).max(1),
  avgSlippage: z.number(),
  entryTimingScore: z.number().min(0).max(100), // How good were entry points
});
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Alert condition schemas
export const PriceMoveConditionSchema = z.object({
  direction: z.enum(["above", "below"]),
  threshold: z.number().min(0).max(1),
});

export const VolumeSpikeConditionSchema = z.object({
  multiplier: z.number().min(1), // e.g., 2x normal volume
  timeWindow: z.number(), // hours
});

export const LiquidityDropConditionSchema = z.object({
  dropPercent: z.number().min(0).max(100),
  timeWindow: z.number(), // hours
});

export const AlertConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("price_move"), ...PriceMoveConditionSchema.shape }),
  z.object({ type: z.literal("volume_spike"), ...VolumeSpikeConditionSchema.shape }),
  z.object({ type: z.literal("liquidity_drop"), ...LiquidityDropConditionSchema.shape }),
]);
export type AlertCondition = z.infer<typeof AlertConditionSchema>;
