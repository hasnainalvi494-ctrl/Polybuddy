import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  db,
  markets,
  marketSnapshots,
  portfolioPositions,
  trackedWallets,
} from "@polybuddy/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import {
  classifyMarketState,
  analyzePortfolioExposure,
  isExposureDangerous,
  detectRelation,
  checkConsistency,
  classifyBehavior,
  getClusterDisplayInfo,
  type MarketFeaturesInput,
  type PositionInput,
  type MarketPairInput,
  type MarketInput,
} from "@polybuddy/analytics";

// UUID validation helper
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

// Response schemas for retail-friendly format
const WhyBulletSchema = z.object({
  text: z.string(),
  metric: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  comparison: z.string().optional(),
});

const MarketStateResponseSchema = z.object({
  marketId: z.string(),
  stateLabel: z.enum(["calm_liquid", "thin_slippage", "jumpy", "event_driven"]),
  displayLabel: z.string(),
  confidence: z.number(),
  whyBullets: z.array(WhyBulletSchema).length(3),
  features: z.object({
    spreadPct: z.number().nullable(),
    depthUsd: z.number().nullable(),
    stalenessMinutes: z.number().nullable(),
    volatility: z.number().nullable(),
  }),
  computedAt: z.string(),
});

const ExposureClusterSchema = z.object({
  clusterId: z.string(),
  label: z.string(),
  exposurePct: z.number(),
  exposureUsd: z.number(),
  marketCount: z.number(),
  confidence: z.number(),
  whyBullets: z.array(WhyBulletSchema).length(3),
  markets: z.array(
    z.object({
      marketId: z.string(),
      question: z.string(),
      exposure: z.number(),
      weight: z.number(),
    })
  ),
});

const ExposureResponseSchema = z.object({
  walletId: z.string(),
  totalExposure: z.number(),
  clusters: z.array(ExposureClusterSchema),
  concentrationRisk: z.number(),
  diversificationScore: z.number(),
  topClusterExposure: z.number(),
  warning: z.string().nullable(),
  isDangerous: z.boolean(),
  computedAt: z.string(),
});

const ConsistencyCheckSchema = z.object({
  aMarketId: z.string(),
  bMarketId: z.string(),
  aQuestion: z.string(),
  bQuestion: z.string(),
  relationType: z.enum(["calendar_variant", "multi_outcome", "inverse", "correlated"]),
  label: z.enum([
    "looks_consistent",
    "potential_inconsistency_low",
    "potential_inconsistency_medium",
    "potential_inconsistency_high",
  ]),
  displayLabel: z.string(),
  score: z.number(),
  confidence: z.number(),
  whyBullets: z.array(WhyBulletSchema).length(3),
  priceA: z.number(),
  priceB: z.number(),
  computedAt: z.string(),
});

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // =============================================
  // MARKET STATE - GET /api/analytics/markets/:id/state
  // =============================================
  typedApp.get(
    "/markets/:id/state",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: MarketStateResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get market and latest snapshot
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      const [snapshot] = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      // Build features input
      const features: MarketFeaturesInput = {
        marketId: id,
        ts: new Date(),
        spread: snapshot?.spread ? Number(snapshot.spread) : null,
        depth: snapshot?.depth ? Number(snapshot.depth) : null,
        staleness: snapshot?.snapshotAt
          ? Math.floor((Date.now() - snapshot.snapshotAt.getTime()) / 1000)
          : null,
        volProxy: null, // Would need historical data to calculate
        impactProxy: null, // Would need to estimate from depth/volume
        tradeCount: null,
        volumeUsd: snapshot?.volume24h ? Number(snapshot.volume24h) : null,
      };

      const result = classifyMarketState(features);

      return {
        marketId: result.marketId,
        stateLabel: result.stateLabel,
        displayLabel: result.displayLabel,
        confidence: result.confidence,
        whyBullets: result.whyBullets,
        features: result.features,
        computedAt: result.computedAt.toISOString(),
      };
    }
  );

  // =============================================
  // HIDDEN EXPOSURE - GET /api/analytics/wallets/:id/exposure
  // =============================================
  typedApp.get(
    "/wallets/:id/exposure",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ExposureResponseSchema,
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const { id } = request.params;

      // Verify wallet belongs to user
      const wallet = await db.query.trackedWallets.findFirst({
        where: and(eq(trackedWallets.id, id), eq(trackedWallets.userId, user.id)),
      });

      if (!wallet) {
        return reply.status(404).send({ error: `Wallet ${id} not found` });
      }

      // Get positions with market data
      const positionsData = await db
        .select({
          marketId: portfolioPositions.marketId,
          outcome: portfolioPositions.outcome,
          shares: portfolioPositions.shares,
          currentValue: portfolioPositions.currentValue,
          marketQuestion: markets.question,
          marketCategory: markets.category,
        })
        .from(portfolioPositions)
        .innerJoin(markets, eq(portfolioPositions.marketId, markets.id))
        .where(eq(portfolioPositions.walletId, id));

      // Build position inputs for analysis
      const positions: PositionInput[] = positionsData.map((p) => ({
        marketId: p.marketId,
        question: p.marketQuestion,
        category: p.marketCategory,
        exposure: p.currentValue ? Math.abs(Number(p.currentValue)) : 0,
        outcome: p.outcome,
      }));

      const exposure = analyzePortfolioExposure(id, positions);
      const danger = isExposureDangerous(exposure);

      return {
        walletId: exposure.walletId,
        totalExposure: exposure.totalExposure,
        clusters: exposure.clusters.map((c) => ({
          ...c,
          whyBullets: c.whyBullets,
        })),
        concentrationRisk: exposure.concentrationRisk,
        diversificationScore: exposure.diversificationScore,
        topClusterExposure: exposure.topClusterExposure,
        warning: danger.warning,
        isDangerous: danger.isDangerous,
        computedAt: exposure.computedAt.toISOString(),
      };
    }
  );

  // =============================================
  // CONSISTENCY CHECK - POST /api/analytics/consistency
  // =============================================
  typedApp.post(
    "/consistency",
    {
      schema: {
        body: z.object({
          marketIds: z.array(z.string().uuid()).min(2).max(20),
        }),
        response: {
          200: z.object({
            checks: z.array(ConsistencyCheckSchema),
            summary: z.object({
              totalPairs: z.number(),
              relatedPairs: z.number(),
              inconsistentPairs: z.number(),
            }),
          }),
        },
      },
    },
    async (request) => {
      const { marketIds } = request.body;

      // Get market data
      const marketRows = await db
        .select({
          id: markets.id,
          question: markets.question,
          category: markets.category,
          endDate: markets.endDate,
        })
        .from(markets)
        .where(sql`${markets.id} IN ${marketIds}`);

      // Get latest prices
      const snapshots = await db
        .select({
          marketId: marketSnapshots.marketId,
          price: marketSnapshots.price,
        })
        .from(marketSnapshots)
        .where(
          sql`${marketSnapshots.marketId} IN ${marketIds} AND ${marketSnapshots.snapshotAt} = (
            SELECT MAX(snapshot_at) FROM market_snapshots ms2 WHERE ms2.market_id = ${marketSnapshots.marketId}
          )`
        );

      const priceMap = new Map(snapshots.map((s) => [s.marketId, Number(s.price)]));
      const marketMap = new Map(marketRows.map((m) => [m.id, m]));

      const checks: Array<{
        aMarketId: string;
        bMarketId: string;
        aQuestion: string;
        bQuestion: string;
        relationType: "calendar_variant" | "multi_outcome" | "inverse" | "correlated";
        label: "looks_consistent" | "potential_inconsistency_low" | "potential_inconsistency_medium" | "potential_inconsistency_high";
        displayLabel: string;
        score: number;
        confidence: number;
        whyBullets: Array<{
          text: string;
          metric: string;
          value: number;
          unit?: string;
          comparison?: string;
        }>;
        priceA: number;
        priceB: number;
        computedAt: string;
      }> = [];

      // Check all pairs
      for (let i = 0; i < marketIds.length; i++) {
        for (let j = i + 1; j < marketIds.length; j++) {
          const aId = marketIds[i]!;
          const bId = marketIds[j]!;
          const marketA = marketMap.get(aId);
          const marketB = marketMap.get(bId);

          if (!marketA || !marketB) continue;

          const pair: MarketPairInput = {
            aMarketId: aId,
            aQuestion: marketA.question,
            aPrice: priceMap.get(aId) ?? 0.5,
            aEndDate: marketA.endDate,
            aCategory: marketA.category,
            bMarketId: bId,
            bQuestion: marketB.question,
            bPrice: priceMap.get(bId) ?? 0.5,
            bEndDate: marketB.endDate,
            bCategory: marketB.category,
          };

          const relation = detectRelation(pair);
          if (relation) {
            const result = checkConsistency(pair, relation);
            checks.push({
              aMarketId: result.aMarketId,
              bMarketId: result.bMarketId,
              aQuestion: result.aQuestion,
              bQuestion: result.bQuestion,
              relationType: result.relationType,
              label: result.label,
              displayLabel: result.displayLabel,
              score: result.score,
              confidence: result.confidence,
              whyBullets: result.whyBullets,
              priceA: result.priceA,
              priceB: result.priceB,
              computedAt: result.computedAt.toISOString(),
            });
          }
        }
      }

      const totalPairs = (marketIds.length * (marketIds.length - 1)) / 2;
      const relatedPairs = checks.length;
      const inconsistentPairs = checks.filter(
        (c) => c.label !== "looks_consistent"
      ).length;

      return {
        checks,
        summary: {
          totalPairs,
          relatedPairs,
          inconsistentPairs,
        },
      };
    }
  );

  // =============================================
  // CONSISTENCY CHECK FOR SINGLE MARKET - GET /api/analytics/markets/:id/related
  // =============================================
  typedApp.get(
    "/markets/:id/related",
    {
      schema: {
        params: z.object({ id: z.string() }),
        querystring: z.object({
          limit: z.coerce.number().min(1).max(20).default(5),
        }),
        response: {
          200: z.object({
            marketId: z.string(),
            relatedMarkets: z.array(ConsistencyCheckSchema),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { limit } = request.query;

      if (!isValidUUID(id)) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get target market
      const targetMarket = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!targetMarket) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get potential related markets (same category or similar question words)
      const candidateMarkets = await db
        .select({
          id: markets.id,
          question: markets.question,
          category: markets.category,
          endDate: markets.endDate,
        })
        .from(markets)
        .where(
          and(
            sql`${markets.id} != ${id}`,
            sql`(${markets.category} = ${targetMarket.category} OR ${markets.question} ILIKE ${'%' + targetMarket.question.split(' ').slice(0, 3).join('%') + '%'})`
          )
        )
        .limit(50);

      // Get prices
      const allMarketIds = [id, ...candidateMarkets.map((m) => m.id)];
      const snapshots = await db
        .select({
          marketId: marketSnapshots.marketId,
          price: marketSnapshots.price,
        })
        .from(marketSnapshots)
        .where(
          sql`${marketSnapshots.marketId} IN ${allMarketIds} AND ${marketSnapshots.snapshotAt} = (
            SELECT MAX(snapshot_at) FROM market_snapshots ms2 WHERE ms2.market_id = ${marketSnapshots.marketId}
          )`
        );

      const priceMap = new Map(snapshots.map((s) => [s.marketId, Number(s.price)]));
      const targetPrice = priceMap.get(id) ?? 0.5;

      const relatedMarkets: Array<{
        aMarketId: string;
        bMarketId: string;
        aQuestion: string;
        bQuestion: string;
        relationType: "calendar_variant" | "multi_outcome" | "inverse" | "correlated";
        label: "looks_consistent" | "potential_inconsistency_low" | "potential_inconsistency_medium" | "potential_inconsistency_high";
        displayLabel: string;
        score: number;
        confidence: number;
        whyBullets: Array<{
          text: string;
          metric: string;
          value: number;
          unit?: string;
          comparison?: string;
        }>;
        priceA: number;
        priceB: number;
        computedAt: string;
      }> = [];

      for (const candidate of candidateMarkets) {
        const pair: MarketPairInput = {
          aMarketId: id,
          aQuestion: targetMarket.question,
          aPrice: targetPrice,
          aEndDate: targetMarket.endDate,
          aCategory: targetMarket.category,
          bMarketId: candidate.id,
          bQuestion: candidate.question,
          bPrice: priceMap.get(candidate.id) ?? 0.5,
          bEndDate: candidate.endDate,
          bCategory: candidate.category,
        };

        const relation = detectRelation(pair);
        if (relation) {
          const result = checkConsistency(pair, relation);
          relatedMarkets.push({
            aMarketId: result.aMarketId,
            bMarketId: result.bMarketId,
            aQuestion: result.aQuestion,
            bQuestion: result.bQuestion,
            relationType: result.relationType,
            label: result.label,
            displayLabel: result.displayLabel,
            score: result.score,
            confidence: result.confidence,
            whyBullets: result.whyBullets,
            priceA: result.priceA,
            priceB: result.priceB,
            computedAt: result.computedAt.toISOString(),
          });

          if (relatedMarkets.length >= limit) break;
        }
      }

      return {
        marketId: id,
        relatedMarkets,
      };
    }
  );

  // =============================================
  // BEHAVIOR CLUSTER - GET /api/analytics/markets/:id/behavior
  // =============================================
  typedApp.get(
    "/markets/:id/behavior",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({
            marketId: z.string(),
            cluster: z.enum([
              "scheduled_event",
              "continuous_info",
              "binary_catalyst",
              "high_volatility",
              "long_duration",
              "sports_scheduled",
            ]),
            clusterLabel: z.string(),
            confidence: z.number(),
            explanation: z.string(),
            dimensions: z.object({
              infoCadence: z.number(),
              infoStructure: z.number(),
              liquidityStability: z.number(),
              timeToResolution: z.number(),
              participantConcentration: z.number(),
            }),
            whyBullets: z.array(WhyBulletSchema),
            displayInfo: z.object({
              label: z.string(),
              description: z.string(),
              color: z.string(),
              icon: z.string(),
            }),
            computedAt: z.string(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get market
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get latest snapshot for metrics
      const [snapshot] = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      // Build market input
      const marketInput: MarketInput = {
        marketId: id,
        question: market.question,
        category: market.category,
        endDate: market.endDate,
        avgSpread: snapshot?.spread ? Number(snapshot.spread) : null,
        avgVolume24h: snapshot?.volume24h ? Number(snapshot.volume24h) : null,
      };

      const result = classifyBehavior(marketInput);
      const displayInfo = getClusterDisplayInfo(result.cluster);

      return {
        marketId: result.marketId,
        cluster: result.cluster,
        clusterLabel: result.clusterLabel,
        confidence: result.confidence,
        explanation: result.explanation,
        dimensions: result.dimensions,
        whyBullets: result.whyBullets,
        displayInfo,
        computedAt: result.computedAt.toISOString(),
      };
    }
  );
};
