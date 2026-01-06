import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots, retailSignals } from "@polybuddy/db";
import { eq, and, desc, sql, gte, isNotNull } from "drizzle-orm";

// ============================================
// TYPES
// ============================================

const WhyBulletSchema = z.object({
  text: z.string(),
  metric: z.string(),
  value: z.number(),
  unit: z.string().optional(),
});

const RetailSignalSchema = z.object({
  id: z.string().uuid(),
  marketId: z.string().uuid(),
  signalType: z.enum([
    "favorable_structure",
    "structural_mispricing",
    "crowd_chasing",
    "event_window",
    "retail_friendliness",
  ]),
  label: z.string(),
  isFavorable: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]),
  whyBullets: z.array(WhyBulletSchema),
  metrics: z.record(z.unknown()).nullable(),
  computedAt: z.string(),
});

type WhyBullet = z.infer<typeof WhyBulletSchema>;

// ============================================
// SIGNAL TYPE 1: FAVORABLE MARKET STRUCTURE
// ============================================

type FavorableStructureMetrics = {
  spreadPct: number;
  depthUsd: number;
  stabilityScore: number;
  hoursToResolution: number | null;
};

function computeFavorableStructureSignal(
  market: {
    id: string;
    endDate: Date | null;
  },
  snapshot: {
    spread: number | null;
    depth: number | null;
    price: number | null;
    volume24h: number | null;
  }
): {
  label: string;
  isFavorable: boolean;
  confidence: "low" | "medium" | "high";
  whyBullets: WhyBullet[];
  metrics: FavorableStructureMetrics;
} | null {
  // Need minimum data
  if (!snapshot.spread && !snapshot.depth) return null;

  const spreadPct = snapshot.spread ? snapshot.spread * 100 : 10; // Default high if unknown
  const depthUsd = snapshot.depth || 0;
  const volume = snapshot.volume24h || 0;

  // Calculate stability score (price stability relative to volume)
  // Higher volume with lower price volatility = more stable
  const stabilityScore = volume > 0
    ? Math.min(100, Math.max(0, 50 + (depthUsd / volume) * 50))
    : 50;

  // Hours to resolution
  const now = new Date();
  const hoursToResolution = market.endDate
    ? (market.endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    : null;

  // Scoring criteria
  const isTightSpread = spreadPct < 3;
  const hasSufficientDepth = depthUsd > 5000;
  const isStable = stabilityScore > 60;
  const hasLongHorizon = hoursToResolution === null || hoursToResolution > 72;

  // Count favorable conditions
  const favorableCount = [isTightSpread, hasSufficientDepth, isStable, hasLongHorizon]
    .filter(Boolean).length;

  const isFavorable = favorableCount >= 3;

  // Confidence based on how clear-cut the metrics are
  let confidence: "low" | "medium" | "high" = "medium";
  if (favorableCount >= 4 || favorableCount <= 1) {
    confidence = "high";
  } else if (favorableCount === 2) {
    confidence = "low";
  }

  const label = isFavorable
    ? "Favorable Setup: Low Friction"
    : "Unfavorable: High Friction";

  const whyBullets: WhyBullet[] = [
    {
      text: isTightSpread
        ? `Tight spread of ${spreadPct.toFixed(1)}% minimizes entry/exit costs`
        : `Wide spread of ${spreadPct.toFixed(1)}% increases execution costs`,
      metric: "spread",
      value: spreadPct,
      unit: "%",
    },
    {
      text: hasSufficientDepth
        ? `Depth of $${(depthUsd / 1000).toFixed(1)}K supports position sizes without slippage`
        : `Limited depth of $${(depthUsd / 1000).toFixed(1)}K may cause slippage`,
      metric: "depth",
      value: depthUsd,
      unit: "USD",
    },
    {
      text: isStable
        ? `Stability score of ${stabilityScore.toFixed(0)} indicates steady pricing`
        : `Stability score of ${stabilityScore.toFixed(0)} suggests price volatility`,
      metric: "stability",
      value: stabilityScore,
    },
  ];

  return {
    label,
    isFavorable,
    confidence,
    whyBullets,
    metrics: {
      spreadPct,
      depthUsd,
      stabilityScore,
      hoursToResolution,
    },
  };
}

// ============================================
// ROUTES
// ============================================

export const retailSignalsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Get favorable structure signal for a market
  typedApp.get(
    "/markets/:marketId/favorable-structure",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: RetailSignalSchema.nullable(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check for cached signal (within last hour)
      const existingSignal = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            eq(retailSignals.signalType, "favorable_structure"),
            gte(retailSignals.computedAt, new Date(Date.now() - 60 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt))
        .limit(1);

      if (existingSignal.length > 0) {
        const signal = existingSignal[0]!;
        return {
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        };
      }

      // Get market data
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get latest snapshot
      const latestSnapshot = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, marketId))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      const snapshot = latestSnapshot[0];
      if (!snapshot) {
        return null; // No data to compute signal
      }

      const result = computeFavorableStructureSignal(
        { id: market.id, endDate: market.endDate },
        {
          spread: snapshot.spread ? Number(snapshot.spread) : null,
          depth: snapshot.depth ? Number(snapshot.depth) : null,
          price: snapshot.price ? Number(snapshot.price) : null,
          volume24h: snapshot.volume24h ? Number(snapshot.volume24h) : null,
        }
      );

      if (!result) {
        return null;
      }

      // Store the computed signal
      const [newSignal] = await db
        .insert(retailSignals)
        .values({
          marketId,
          signalType: "favorable_structure",
          label: result.label,
          isFavorable: result.isFavorable,
          confidence: result.confidence,
          whyBullets: result.whyBullets,
          metrics: result.metrics,
          validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000), // Valid for 2 hours
        })
        .returning();

      return {
        id: newSignal!.id,
        marketId: newSignal!.marketId,
        signalType: newSignal!.signalType,
        label: newSignal!.label,
        isFavorable: newSignal!.isFavorable,
        confidence: newSignal!.confidence,
        whyBullets: result.whyBullets,
        metrics: result.metrics,
        computedAt: newSignal!.computedAt?.toISOString() || new Date().toISOString(),
      };
    }
  );

  // Get all retail signals for a market
  typedApp.get(
    "/markets/:marketId",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: z.object({
            marketId: z.string().uuid(),
            signals: z.array(RetailSignalSchema),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check market exists
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get all recent signals for this market
      const signals = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            gte(retailSignals.computedAt, new Date(Date.now() - 2 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt));

      // Dedupe by signal type (keep most recent)
      const signalMap = new Map<string, typeof signals[0]>();
      for (const signal of signals) {
        if (!signalMap.has(signal.signalType)) {
          signalMap.set(signal.signalType, signal);
        }
      }

      return {
        marketId,
        signals: Array.from(signalMap.values()).map((signal) => ({
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        })),
      };
    }
  );
};
