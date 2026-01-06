import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots, retailSignals, marketBehaviorDimensions } from "@polybuddy/db";
import { eq, desc, sql, and, gte, lte, isNotNull } from "drizzle-orm";

const DailyResponseSchema = z.object({
  worthAttention: z.array(z.object({
    id: z.string(),
    question: z.string(),
    category: z.string().nullable(),
    setupLabel: z.string(),
    confidence: z.number(),
    whyBullets: z.array(z.object({
      text: z.string(),
      value: z.string(),
      unit: z.string(),
    })),
    whyThisMatters: z.string(),
  })),
  retailTraps: z.array(z.object({
    id: z.string(),
    question: z.string(),
    category: z.string().nullable(),
    warningLabel: z.string(),
    commonMistake: z.string(),
  })),
  whatChanged: z.array(z.object({
    marketId: z.string(),
    question: z.string(),
    changeType: z.enum(["state_shift", "event_window", "mispricing"]),
    description: z.string(),
  })),
  generatedAt: z.string(),
});

export const dailyRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    "/",
    {
      schema: {
        response: {
          200: DailyResponseSchema,
        },
      },
    },
    async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get markets with favorable retail signals
      const favorableSignals = await db
        .select({
          marketId: retailSignals.marketId,
          signalType: retailSignals.signalType,
          label: retailSignals.label,
          confidence: retailSignals.confidence,
          whyBullets: retailSignals.whyBullets,
        })
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.isFavorable, true),
            gte(retailSignals.computedAt, yesterday)
          )
        )
        .limit(20);

      // Get market details for favorable signals
      const worthAttention = [];
      for (const signal of favorableSignals.slice(0, 6)) {
        const market = await db.query.markets.findFirst({
          where: eq(markets.id, signal.marketId),
        });
        if (market) {
          const bullets = (signal.whyBullets as Array<{ text: string; metric?: string; value?: number; unit?: string }>) || [];
          worthAttention.push({
            id: market.id,
            question: market.question,
            category: market.category,
            setupLabel: signal.label,
            confidence: signal.confidence === "high" ? 85 : signal.confidence === "medium" ? 65 : 45,
            whyBullets: bullets.slice(0, 3).map(b => ({
              text: b.text || b.metric || "Metric",
              value: String(b.value || "N/A"),
              unit: b.unit || "",
            })),
            whyThisMatters: getWhyMatters(signal.signalType as string),
          });
        }
      }

      // Get markets with unfavorable signals (retail traps)
      const unfavorableSignals = await db
        .select({
          marketId: retailSignals.marketId,
          signalType: retailSignals.signalType,
          label: retailSignals.label,
        })
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.isFavorable, false),
            gte(retailSignals.computedAt, yesterday)
          )
        )
        .limit(20);

      // Get retail traps with behavior dimensions
      const retailTraps = [];
      for (const signal of unfavorableSignals.slice(0, 6)) {
        const market = await db.query.markets.findFirst({
          where: eq(markets.id, signal.marketId),
        });
        const behavior = await db.query.marketBehaviorDimensions.findFirst({
          where: eq(marketBehaviorDimensions.marketId, signal.marketId),
        });
        if (market) {
          retailTraps.push({
            id: market.id,
            question: market.question,
            category: market.category,
            warningLabel: signal.label,
            commonMistake: behavior?.commonRetailMistake || getDefaultMistake(signal.signalType as string),
          });
        }
      }

      // Get markets with recent changes (simplified - check for volume spikes)
      const whatChanged = [];

      // Find markets with volume spikes
      const volumeSpikes = await db.execute<{ market_id: string; volume_24h: string; prev_volume: string }>(sql`
        WITH recent AS (
          SELECT DISTINCT ON (market_id) market_id, volume_24h, snapshot_at
          FROM market_snapshots
          WHERE snapshot_at > NOW() - INTERVAL '6 hours'
          ORDER BY market_id, snapshot_at DESC
        ),
        previous AS (
          SELECT DISTINCT ON (market_id) market_id, volume_24h as prev_volume
          FROM market_snapshots
          WHERE snapshot_at BETWEEN NOW() - INTERVAL '30 hours' AND NOW() - INTERVAL '24 hours'
          ORDER BY market_id, snapshot_at DESC
        )
        SELECT r.market_id, r.volume_24h, p.prev_volume
        FROM recent r
        JOIN previous p ON r.market_id = p.market_id
        WHERE r.volume_24h::numeric > p.prev_volume::numeric * 2
          AND r.volume_24h::numeric > 1000
        LIMIT 10
      `);

      for (const spike of Array.from(volumeSpikes).slice(0, 5)) {
        const market = await db.query.markets.findFirst({
          where: eq(markets.id, spike.market_id),
        });
        if (market) {
          const changePercent = ((Number(spike.volume_24h) / Number(spike.prev_volume)) - 1) * 100;
          whatChanged.push({
            marketId: market.id,
            question: market.question,
            changeType: "state_shift" as const,
            description: `Volume up ${changePercent.toFixed(0)}% vs yesterday — increased attention`,
          });
        }
      }

      // Find markets approaching resolution (event windows)
      const approachingResolution = await db
        .select()
        .from(markets)
        .where(
          and(
            gte(markets.endDate, now),
            lte(markets.endDate, new Date(now.getTime() + 48 * 60 * 60 * 1000)),
            eq(markets.resolved, false)
          )
        )
        .orderBy(markets.endDate)
        .limit(5);

      for (const market of approachingResolution) {
        if (whatChanged.length < 10) {
          const hoursLeft = market.endDate
            ? Math.round((market.endDate.getTime() - now.getTime()) / (1000 * 60 * 60))
            : 0;
          whatChanged.push({
            marketId: market.id,
            question: market.question,
            changeType: "event_window" as const,
            description: `Resolves in ${hoursLeft} hours — final positioning window`,
          });
        }
      }

      return {
        worthAttention,
        retailTraps,
        whatChanged,
        generatedAt: now.toISOString(),
      };
    }
  );
};

function getWhyMatters(signalType: string): string {
  const reasons: Record<string, string> = {
    favorable_structure: "Lower friction means more of your edge translates to profit.",
    structural_mispricing: "Price divergence from related markets creates opportunity.",
    event_window: "Defined timeline helps manage position sizing and exit planning.",
    retail_friendliness: "Market structure doesn't systematically disadvantage smaller participants.",
  };
  return reasons[signalType] || "Favorable conditions for retail participation.";
}

function getDefaultMistake(signalType: string): string {
  const mistakes: Record<string, string> = {
    crowd_chasing: "Entering after the move has happened, paying inflated prices.",
    high_volatility: "Panic selling on dips or FOMO buying on spikes.",
    continuous_info: "Reacting to news that faster traders have already priced in.",
  };
  return mistakes[signalType] || "Entering without understanding the structural disadvantages.";
}
