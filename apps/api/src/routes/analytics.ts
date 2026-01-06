import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  db,
  markets,
  marketSnapshots,
  portfolioPositions,
  trackedWallets,
  walletFlowEvents,
  flowLabels,
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

  // =============================================
  // FLOW ANALYSIS - GET /api/analytics/markets/:id/flow
  // =============================================
  typedApp.get(
    "/markets/:id/flow",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({
            marketId: z.string(),
            flowType: z.enum(["smart_money", "mixed", "retail_dominated", "unknown"]),
            flowLabel: z.string(),
            confidence: z.number(),
            metrics: z.object({
              totalTransactions: z.number(),
              smartMoneyTransactions: z.number(),
              retailTransactions: z.number(),
              smartMoneyVolume: z.number(),
              retailVolume: z.number(),
              netFlowDirection: z.enum(["bullish", "bearish", "neutral"]),
              largestTransaction: z.number().nullable(),
            }),
            recentActivity: z.array(
              z.object({
                timestamp: z.string(),
                type: z.enum(["smart_money", "retail", "unknown"]),
                direction: z.enum(["buy", "sell"]),
                volumeUsd: z.number(),
              })
            ),
            whyBullets: z.array(WhyBulletSchema),
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

      // Check market exists
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get flow events for this market
      const events = await db
        .select({
          id: walletFlowEvents.id,
          side: walletFlowEvents.side,
          notional: walletFlowEvents.notional,
          startTs: walletFlowEvents.startTs,
        })
        .from(walletFlowEvents)
        .where(eq(walletFlowEvents.marketId, id))
        .orderBy(desc(walletFlowEvents.startTs))
        .limit(100);

      // Get labels for these events
      const eventIds = events.map((e) => e.id);
      const labels = eventIds.length > 0
        ? await db
            .select({
              flowEventId: flowLabels.flowEventId,
              label: flowLabels.label,
              confidence: flowLabels.confidence,
            })
            .from(flowLabels)
            .where(sql`${flowLabels.flowEventId} IN ${eventIds}`)
        : [];

      const labelMap = new Map(labels.map((l) => [l.flowEventId, l]));

      // Calculate metrics
      let smartMoneyCount = 0;
      let retailCount = 0;
      let unknownCount = 0;
      let smartMoneyVolume = 0;
      let retailVolume = 0;
      let buyVolume = 0;
      let sellVolume = 0;
      let largestTx: number | null = null;

      const recentActivity: Array<{
        timestamp: string;
        type: "smart_money" | "retail" | "unknown";
        direction: "buy" | "sell";
        volumeUsd: number;
      }> = [];

      for (const event of events) {
        const label = labelMap.get(event.id);
        const volume = event.notional ? Number(event.notional) : 0;
        const isBuy = event.side === "buy" || event.side === "long";

        if (largestTx === null || volume > largestTx) {
          largestTx = volume;
        }

        if (isBuy) {
          buyVolume += volume;
        } else {
          sellVolume += volume;
        }

        // Map flow labels to smart money vs retail
        // sustained_accumulation = smart money pattern
        // one_off_spike = could be either (large single tx)
        // crowd_chase = retail pattern
        // exhaustion_move = retail pattern
        let flowType: "smart_money" | "retail" | "unknown" = "unknown";
        if (label) {
          if (label.label === "sustained_accumulation") {
            flowType = "smart_money";
            smartMoneyCount++;
            smartMoneyVolume += volume;
          } else if (label.label === "crowd_chase" || label.label === "exhaustion_move") {
            flowType = "retail";
            retailCount++;
            retailVolume += volume;
          } else if (label.label === "one_off_spike") {
            // Large single transactions could be either - classify based on size
            if (volume > 10000) {
              flowType = "smart_money";
              smartMoneyCount++;
              smartMoneyVolume += volume;
            } else {
              flowType = "retail";
              retailCount++;
              retailVolume += volume;
            }
          } else {
            unknownCount++;
          }
        } else {
          unknownCount++;
        }

        if (recentActivity.length < 10) {
          recentActivity.push({
            timestamp: event.startTs?.toISOString() ?? new Date().toISOString(),
            type: flowType,
            direction: isBuy ? "buy" : "sell",
            volumeUsd: volume,
          });
        }
      }

      // Determine overall flow type
      const totalTransactions = smartMoneyCount + retailCount + unknownCount;
      let flowType: "smart_money" | "mixed" | "retail_dominated" | "unknown" = "unknown";
      let flowLabel = "Unknown Activity";
      let confidence = 50;

      if (totalTransactions > 0) {
        const smartMoneyRatio = smartMoneyCount / totalTransactions;
        const retailRatio = retailCount / totalTransactions;

        if (smartMoneyRatio > 0.6) {
          flowType = "smart_money";
          flowLabel = "Smart Money Flow";
          confidence = Math.round(70 + smartMoneyRatio * 30);
        } else if (retailRatio > 0.6) {
          flowType = "retail_dominated";
          flowLabel = "Retail Dominated";
          confidence = Math.round(70 + retailRatio * 30);
        } else if (smartMoneyCount > 0 || retailCount > 0) {
          flowType = "mixed";
          flowLabel = "Mixed Flow";
          confidence = 60;
        }
      }

      // Determine net flow direction
      const netFlow = buyVolume - sellVolume;
      const totalVolume = buyVolume + sellVolume;
      let netFlowDirection: "bullish" | "bearish" | "neutral" = "neutral";
      if (totalVolume > 0) {
        const netFlowRatio = Math.abs(netFlow) / totalVolume;
        if (netFlowRatio > 0.1) {
          netFlowDirection = netFlow > 0 ? "bullish" : "bearish";
        }
      }

      // Generate why bullets
      const whyBullets: Array<{
        text: string;
        metric: string;
        value: number;
        unit?: string;
        comparison?: string;
      }> = [];

      if (smartMoneyCount > 0) {
        whyBullets.push({
          text: `${smartMoneyCount} transactions identified as institutional`,
          metric: "smart_money_txs",
          value: smartMoneyCount,
          unit: "transactions",
        });
      }

      if (smartMoneyVolume > 0) {
        whyBullets.push({
          text: `$${(smartMoneyVolume / 1000).toFixed(1)}K in smart money volume`,
          metric: "smart_money_volume",
          value: smartMoneyVolume,
          unit: "USD",
        });
      }

      if (largestTx) {
        whyBullets.push({
          text: `Largest single transaction: $${largestTx.toFixed(0)}`,
          metric: "largest_tx",
          value: largestTx,
          unit: "USD",
        });
      }

      // Pad to 3 bullets if needed
      while (whyBullets.length < 3) {
        if (totalTransactions > 0) {
          whyBullets.push({
            text: `${totalTransactions} total transactions analyzed`,
            metric: "total_txs",
            value: totalTransactions,
            unit: "transactions",
          });
        } else {
          whyBullets.push({
            text: "No flow data available for this market",
            metric: "no_data",
            value: 0,
          });
        }
      }

      return {
        marketId: id,
        flowType,
        flowLabel,
        confidence,
        metrics: {
          totalTransactions,
          smartMoneyTransactions: smartMoneyCount,
          retailTransactions: retailCount,
          smartMoneyVolume,
          retailVolume,
          netFlowDirection,
          largestTransaction: largestTx,
        },
        recentActivity,
        whyBullets: whyBullets.slice(0, 3),
        computedAt: new Date().toISOString(),
      };
    }
  );

  // =============================================
  // PUBLIC FLOW CONTEXT - GET /api/analytics/markets/:id/context
  // =============================================
  typedApp.get(
    "/markets/:id/context",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({
            marketId: z.string(),
            participation: z.object({
              totalWallets: z.number(),
              activeWallets24h: z.number(),
              newWallets24h: z.number(),
              walletTrend: z.enum(["increasing", "decreasing", "stable"]),
            }),
            positions: z.object({
              totalLongPositions: z.number(),
              totalShortPositions: z.number(),
              longShortRatio: z.number(),
              avgPositionSize: z.number(),
              medianPositionSize: z.number(),
            }),
            volume: z.object({
              volume24h: z.number(),
              volume7d: z.number(),
              volumeChange24h: z.number(), // percentage
              avgDailyVolume: z.number(),
              isVolumeSpike: z.boolean(),
            }),
            largeTransactions: z.array(
              z.object({
                timestamp: z.string(),
                direction: z.enum(["buy", "sell"]),
                volumeUsd: z.number(),
                isWhale: z.boolean(),
              })
            ),
            insights: z.array(z.string()),
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

      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get wallet flow events for context
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all flow events for this market
      const allEvents = await db
        .select({
          walletAddress: walletFlowEvents.walletAddress,
          side: walletFlowEvents.side,
          notional: walletFlowEvents.notional,
          startTs: walletFlowEvents.startTs,
        })
        .from(walletFlowEvents)
        .where(eq(walletFlowEvents.marketId, id))
        .orderBy(desc(walletFlowEvents.startTs))
        .limit(500);

      // Calculate participation metrics
      const uniqueWallets = new Set(allEvents.map((e) => e.walletAddress));
      const recent24hEvents = allEvents.filter(
        (e) => e.startTs && e.startTs >= oneDayAgo
      );
      const activeWallets24h = new Set(recent24hEvents.map((e) => e.walletAddress));

      // For new wallets, find wallets whose first transaction is in last 24h
      const walletFirstTx = new Map<string, Date>();
      for (const event of allEvents) {
        if (event.startTs) {
          const existing = walletFirstTx.get(event.walletAddress);
          if (!existing || event.startTs < existing) {
            walletFirstTx.set(event.walletAddress, event.startTs);
          }
        }
      }
      let newWallets24h = 0;
      for (const [, firstTx] of walletFirstTx) {
        if (firstTx >= oneDayAgo) newWallets24h++;
      }

      // Calculate wallet trend
      const prevDayEvents = allEvents.filter(
        (e) =>
          e.startTs &&
          e.startTs >= new Date(oneDayAgo.getTime() - 24 * 60 * 60 * 1000) &&
          e.startTs < oneDayAgo
      );
      const prevDayWallets = new Set(prevDayEvents.map((e) => e.walletAddress));
      let walletTrend: "increasing" | "decreasing" | "stable" = "stable";
      if (activeWallets24h.size > prevDayWallets.size * 1.1) {
        walletTrend = "increasing";
      } else if (activeWallets24h.size < prevDayWallets.size * 0.9) {
        walletTrend = "decreasing";
      }

      // Calculate position metrics
      let longCount = 0;
      let shortCount = 0;
      const positionSizes: number[] = [];

      for (const event of allEvents) {
        const size = event.notional ? Number(event.notional) : 0;
        positionSizes.push(size);
        if (event.side === "buy" || event.side === "long") {
          longCount++;
        } else {
          shortCount++;
        }
      }

      const totalPositions = longCount + shortCount;
      const avgPositionSize =
        positionSizes.length > 0
          ? positionSizes.reduce((a, b) => a + b, 0) / positionSizes.length
          : 0;
      const sortedSizes = positionSizes.sort((a, b) => a - b);
      const medianPositionSize =
        sortedSizes.length > 0
          ? sortedSizes[Math.floor(sortedSizes.length / 2)] ?? 0
          : 0;

      // Calculate volume metrics
      let volume24h = 0;
      let volume7d = 0;
      let volumePrev24h = 0;

      for (const event of allEvents) {
        const vol = event.notional ? Number(event.notional) : 0;
        if (event.startTs && event.startTs >= oneDayAgo) {
          volume24h += vol;
        }
        if (event.startTs && event.startTs >= sevenDaysAgo) {
          volume7d += vol;
        }
        if (
          event.startTs &&
          event.startTs >= new Date(oneDayAgo.getTime() - 24 * 60 * 60 * 1000) &&
          event.startTs < oneDayAgo
        ) {
          volumePrev24h += vol;
        }
      }

      const avgDailyVolume = volume7d / 7;
      const volumeChange24h =
        volumePrev24h > 0
          ? ((volume24h - volumePrev24h) / volumePrev24h) * 100
          : 0;
      const isVolumeSpike = volume24h > avgDailyVolume * 2;

      // Get large transactions (whales = > $10k)
      const largeTransactions = recent24hEvents
        .filter((e) => (e.notional ? Number(e.notional) : 0) > 1000)
        .slice(0, 10)
        .map((e) => ({
          timestamp: e.startTs?.toISOString() ?? new Date().toISOString(),
          direction:
            e.side === "buy" || e.side === "long"
              ? ("buy" as const)
              : ("sell" as const),
          volumeUsd: e.notional ? Number(e.notional) : 0,
          isWhale: (e.notional ? Number(e.notional) : 0) > 10000,
        }));

      // Generate insights
      const insights: string[] = [];

      if (walletTrend === "increasing") {
        insights.push("Growing wallet participation in the last 24h");
      }
      if (newWallets24h > 5) {
        insights.push(`${newWallets24h} new wallets entered this market today`);
      }
      if (isVolumeSpike) {
        insights.push("Volume is 2x+ higher than 7-day average");
      }
      if (longCount > shortCount * 2) {
        insights.push("Market sentiment is heavily bullish");
      } else if (shortCount > longCount * 2) {
        insights.push("Market sentiment is heavily bearish");
      }
      if (largeTransactions.filter((t) => t.isWhale).length > 0) {
        insights.push("Whale activity detected in the last 24h");
      }

      // Pad to at least 3 insights
      while (insights.length < 3) {
        if (uniqueWallets.size > 100) {
          insights.push(`${uniqueWallets.size} unique wallets have traded this market`);
        } else if (avgPositionSize > 0) {
          insights.push(`Average position size is $${avgPositionSize.toFixed(0)}`);
        } else {
          insights.push("Limited trading activity on this market");
        }
      }

      return {
        marketId: id,
        participation: {
          totalWallets: uniqueWallets.size,
          activeWallets24h: activeWallets24h.size,
          newWallets24h,
          walletTrend,
        },
        positions: {
          totalLongPositions: longCount,
          totalShortPositions: shortCount,
          longShortRatio: shortCount > 0 ? longCount / shortCount : longCount,
          avgPositionSize,
          medianPositionSize,
        },
        volume: {
          volume24h,
          volume7d,
          volumeChange24h,
          avgDailyVolume,
          isVolumeSpike,
        },
        largeTransactions,
        insights: insights.slice(0, 4),
        computedAt: new Date().toISOString(),
      };
    }
  );
};
