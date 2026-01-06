import { z } from "zod";

// Market state labels (retail-friendly names)
export const MarketStateLabelSchema = z.enum([
  "calm_liquid",      // Calm & Liquid
  "thin_slippage",    // Thin — Slippage Risk
  "jumpy",            // Jumpier Than Usual
  "event_driven",     // Event-driven — Expect Gaps
]);
export type MarketStateLabel = z.infer<typeof MarketStateLabelSchema>;

// Human-readable labels for display
export const STATE_DISPLAY_LABELS: Record<MarketStateLabel, string> = {
  calm_liquid: "Calm & Liquid",
  thin_slippage: "Thin — Slippage Risk",
  jumpy: "Jumpier Than Usual",
  event_driven: "Event-driven — Expect Gaps",
};

// Why bullet structure - must have numeric evidence
export const WhyBulletSchema = z.object({
  text: z.string(),
  metric: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  comparison: z.string().optional(), // e.g., "vs 7d avg"
});
export type WhyBullet = z.infer<typeof WhyBulletSchema>;

// Market features input
export const MarketFeaturesInputSchema = z.object({
  marketId: z.string().uuid(),
  ts: z.date(),
  spread: z.number().nullable(),
  depth: z.number().nullable(),
  staleness: z.number().nullable(), // seconds since last trade
  volProxy: z.number().nullable(), // rolling price volatility
  impactProxy: z.number().nullable(), // estimated price impact
  tradeCount: z.number().nullable(),
  volumeUsd: z.number().nullable(),
});
export type MarketFeaturesInput = z.infer<typeof MarketFeaturesInputSchema>;

// Market state result
export const MarketStateResultSchema = z.object({
  marketId: z.string().uuid(),
  stateLabel: MarketStateLabelSchema,
  displayLabel: z.string(),
  confidence: z.number().min(0).max(100),
  whyBullets: z.array(WhyBulletSchema).length(3),
  features: z.object({
    spreadPct: z.number().nullable(),
    depthUsd: z.number().nullable(),
    stalenessMinutes: z.number().nullable(),
    volatility: z.number().nullable(),
  }),
  computedAt: z.date(),
});
export type MarketStateResult = z.infer<typeof MarketStateResultSchema>;

// Thresholds (env-configurable)
export interface MarketStateThresholds {
  // Spread thresholds (as decimal, e.g., 0.02 = 2%)
  spreadThin: number;      // Above this = thin market
  spreadJumpy: number;     // Above this = jumpy/wide

  // Depth thresholds (USD)
  depthLow: number;        // Below this = low liquidity
  depthMedium: number;     // Below this = medium liquidity

  // Staleness thresholds (seconds)
  stalenessMedium: number; // Above this = somewhat stale
  stalenessHigh: number;   // Above this = very stale

  // Volatility thresholds (as std dev multiple)
  volHigh: number;         // Above this = high volatility
  volExtreme: number;      // Above this = extreme volatility

  // Persistence (consecutive windows needed to change state)
  stateChangePersistence: number;
}

export const DEFAULT_THRESHOLDS: MarketStateThresholds = {
  spreadThin: 0.03,        // 3%
  spreadJumpy: 0.08,       // 8%
  depthLow: 5000,          // $5K
  depthMedium: 20000,      // $20K
  stalenessMedium: 300,    // 5 minutes
  stalenessHigh: 900,      // 15 minutes
  volHigh: 1.5,            // 1.5x normal
  volExtreme: 3.0,         // 3x normal
  stateChangePersistence: 2,
};
