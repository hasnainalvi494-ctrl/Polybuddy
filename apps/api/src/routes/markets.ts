import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots, marketBehaviorDimensions, retailFlowGuard, marketResolutionDrivers, hiddenExposureLinks, marketParticipationStructure } from "@polybuddy/db";
import { eq, desc, asc, ilike, sql, and, gte } from "drizzle-orm";

// Behavior cluster type
const BehaviorClusterSchema = z.object({
  cluster: z.enum([
    "scheduled_event",
    "continuous_info",
    "binary_catalyst",
    "high_volatility",
    "long_duration",
    "sports_scheduled",
  ]).nullable(),
  confidence: z.number().nullable(),
  explanation: z.string().nullable(),
  dimensions: z.object({
    infoCadence: z.number().nullable(),
    infoStructure: z.number().nullable(),
    liquidityStability: z.number().nullable(),
    timeToResolution: z.number().nullable(),
    participantConcentration: z.number().nullable(),
  }).nullable(),
  // Retail interpretation
  retailInterpretation: z.object({
    friendliness: z.enum(["favorable", "neutral", "unfavorable"]),
    whatThisMeansForRetail: z.string(),
    commonMistake: z.string(),
    whyRetailLoses: z.string(),
    whenRetailCanCompete: z.string(),
  }).nullable(),
});

// Retail interpretation by cluster type
const CLUSTER_RETAIL_INTERPRETATION: Record<string, {
  friendliness: "favorable" | "neutral" | "unfavorable";
  whatThisMeansForRetail: string;
  commonMistake: string;
  whyRetailLoses: string;
  whenRetailCanCompete: string;
}> = {
  scheduled_event: {
    friendliness: "neutral",
    whatThisMeansForRetail: "Events happen on known dates. Price moves are often priced in early by informed traders.",
    commonMistake: "Waiting until the event to trade, when edge is already gone.",
    whyRetailLoses: "Institutions price in outcomes weeks ahead. By event day, odds reflect consensus.",
    whenRetailCanCompete: "When you have genuine local knowledge or can identify when consensus is clearly wrong.",
  },
  continuous_info: {
    friendliness: "unfavorable",
    whatThisMeansForRetail: "Information flows constantly. Prices adjust in real-time to news and data.",
    commonMistake: "Reacting to headlines that are already priced in by faster traders.",
    whyRetailLoses: "Professional traders monitor 24/7 with automated systems. Retail sees news minutes late.",
    whenRetailCanCompete: "Focus on longer timeframes where speed matters less, or niche topics you follow closely.",
  },
  binary_catalyst: {
    friendliness: "neutral",
    whatThisMeansForRetail: "A single event determines the outcome. High risk, high uncertainty.",
    commonMistake: "Oversizing positions on coin-flip events or chasing after initial moves.",
    whyRetailLoses: "Edge is slim. Transaction costs and timing disadvantages compound losses.",
    whenRetailCanCompete: "When you've done deep research and consensus seems clearly mispriced.",
  },
  high_volatility: {
    friendliness: "unfavorable",
    whatThisMeansForRetail: "Prices swing wildly. Emotional decisions are common and costly.",
    commonMistake: "Panic selling on dips or FOMO buying on spikes.",
    whyRetailLoses: "Volatility favors those with iron discipline and deep pockets. Retail capitulates at the worst times.",
    whenRetailCanCompete: "Only if you can truly ignore short-term swings and have conviction in your analysis.",
  },
  long_duration: {
    friendliness: "favorable",
    whatThisMeansForRetail: "Long time horizon reduces the advantage of speed. Research matters more.",
    commonMistake: "Getting bored and exiting early, or overtrading as new information arrives.",
    whyRetailLoses: "Impatience. Retail often sells winners too early or abandons positions.",
    whenRetailCanCompete: "When you can commit to a thesis and hold through noise. This is where retail has an edge.",
  },
  sports_scheduled: {
    friendliness: "unfavorable",
    whatThisMeansForRetail: "Heavily analyzed by sharp bettors. Lines are very efficient.",
    commonMistake: "Betting on favorite teams or following public consensus.",
    whyRetailLoses: "Sports betting markets are extremely efficient. Sharps crush retail consistently.",
    whenRetailCanCompete: "Rarely. Unless you have genuine edge from deep statistical analysis or injury info.",
  },
};

// Flow Guard schema
const FlowGuardSchema = z.object({
  label: z.enum(["historically_noisy", "pro_dominant", "retail_actionable"]),
  confidence: z.enum(["low", "medium", "high"]),
  whyBullets: z.array(z.object({
    text: z.string(),
    metric: z.string().optional(),
    value: z.number().optional(),
    unit: z.string().optional(),
  })),
  commonRetailMistake: z.string(),
  metrics: z.object({
    largeEarlyTradesPct: z.number().nullable(),
    orderBookConcentration: z.number().nullable(),
    depthShiftSpeed: z.number().nullable(),
    repricingSpeed: z.number().nullable(),
  }).optional(),
});

// Flow Guard interpretation by label
const FLOW_GUARD_INTERPRETATION: Record<string, {
  displayLabel: string;
  severity: "warning" | "caution" | "info";
  explanation: string;
  commonMistake: string;
}> = {
  historically_noisy: {
    displayLabel: "Historically Noisy",
    severity: "caution",
    explanation: "Flow signals in this market have been unreliable. Volume spikes and order patterns don't consistently predict price direction.",
    commonMistake: "Assuming large volume means informed trading. In noisy markets, volume often reflects noise, not signal.",
  },
  pro_dominant: {
    displayLabel: "Pro-Dominant Flow",
    severity: "warning",
    explanation: "Professional traders dominate this market's flow. Large early trades and rapid repricing suggest informed activity.",
    commonMistake: "Following the flow hoping to ride the coattails. By the time retail sees the move, the edge is already captured.",
  },
  retail_actionable: {
    displayLabel: "Retail-Actionable",
    severity: "info",
    explanation: "Rare: Flow signals in this market may benefit patient retail traders. Lower professional concentration detected.",
    commonMistake: "Overconfidence. Even favorable flow doesn't guarantee profits. Stick to disciplined position sizing.",
  },
};

// UUID validation helper
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

const MarketQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  category: z.string().optional(),
  minQuality: z.enum(["A", "B", "C", "D", "F"]).optional(),
  cluster: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["volume", "quality", "endDate", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const MarketResponseSchema = z.object({
  id: z.string(),
  polymarketId: z.string(),
  question: z.string(),
  category: z.string().nullable(),
  endDate: z.string().nullable(),
  qualityGrade: z.enum(["A", "B", "C", "D", "F"]).nullable(),
  qualityScore: z.number().nullable(),
  clusterLabel: z.string().nullable(),
  currentPrice: z.number().nullable(),
  volume24h: z.number().nullable(),
  liquidity: z.number().nullable(),
});

export const marketsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Get available categories
  typedApp.get(
    "/categories",
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              category: z.string(),
              count: z.number(),
            })
          ),
        },
      },
    },
    async () => {
      const result = await db
        .select({
          category: markets.category,
          count: sql<number>`count(*)`,
        })
        .from(markets)
        .where(sql`${markets.category} IS NOT NULL AND ${markets.category} != ''`)
        .groupBy(markets.category)
        .orderBy(desc(sql`count(*)`));

      return result.map((r) => ({
        category: r.category!,
        count: Number(r.count),
      }));
    }
  );

  // List markets with filtering
  typedApp.get(
    "/",
    {
      schema: {
        querystring: MarketQuerySchema,
        response: {
          200: z.object({
            data: z.array(MarketResponseSchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const { limit, offset, category, search, sortBy, sortOrder } = request.query;

      // Build where conditions
      const conditions = [];
      if (category) {
        conditions.push(eq(markets.category, category));
      }
      if (search) {
        conditions.push(ilike(markets.question, `%${search}%`));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(markets)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(countResult[0]?.count ?? 0);

      const orderDir = sortOrder === "asc" ? asc : desc;

      let marketRows: {
        id: string;
        polymarketId: string;
        question: string;
        category: string | null;
        endDate: Date | null;
        qualityGrade: "A" | "B" | "C" | "D" | "F" | null;
        qualityScore: string | null;
        clusterLabel: string | null;
      }[];

      // For volume sorting, try to use snapshots, fall back to createdAt if no snapshots
      if (sortBy === "volume") {
        // First check if we have any snapshots
        const snapshotCount = await db.execute<{ count: string }>(sql`SELECT COUNT(*) as count FROM market_snapshots`);
        const hasSnapshots = parseInt(snapshotCount[0]?.count || '0') > 0;
        
        if (hasSnapshots) {
          // Build category filter for SQL if needed
          const categoryFilter = category ? sql`AND m.category = ${category}` : sql``;
          const searchFilter = search ? sql`AND LOWER(m.question) LIKE ${`%${search.toLowerCase()}%`}` : sql``;
          
          // Get markets with their latest volume, applying filters
          const volumeResults = await db.execute<{ market_id: string; volume_24h: string }>(sql`
            SELECT DISTINCT ON (ms.market_id) ms.market_id, ms.volume_24h
            FROM market_snapshots ms
            INNER JOIN markets m ON m.id = ms.market_id
            WHERE ms.volume_24h IS NOT NULL
              ${categoryFilter}
              ${searchFilter}
            ORDER BY ms.market_id, ms.snapshot_at DESC
          `);

          // Convert to array and sort by volume
          const volumeRows = Array.from(volumeResults) as { market_id: string; volume_24h: string }[];
          const sortedByVolume = volumeRows
            .map(r => ({ marketId: r.market_id, volume: Number(r.volume_24h) || 0 }))
            .sort((a, b) => sortOrder === "desc" ? b.volume - a.volume : a.volume - b.volume)
            .slice(offset, offset + limit);

          const sortedMarketIds = sortedByVolume.map(r => r.marketId);

          if (sortedMarketIds.length > 0) {
            // Fetch market details for these IDs
            const marketsData = await db
              .select({
                id: markets.id,
                polymarketId: markets.polymarketId,
                question: markets.question,
                category: markets.category,
                endDate: markets.endDate,
                qualityGrade: markets.qualityGrade,
                qualityScore: markets.qualityScore,
                clusterLabel: markets.clusterLabel,
              })
              .from(markets)
              .where(sql`${markets.id} IN (${sql.join(sortedMarketIds.map((id: string) => sql`${id}::uuid`), sql`, `)})`);

            // Reorder to match volume sort order
            const marketMap = new Map(marketsData.map(m => [m.id, m]));
            marketRows = sortedMarketIds.map((id: string) => marketMap.get(id)!).filter(Boolean);
          } else {
            marketRows = [];
          }
        } else {
          // No snapshots, fall back to sorting by createdAt
          marketRows = await db
            .select({
              id: markets.id,
              polymarketId: markets.polymarketId,
              question: markets.question,
              category: markets.category,
              endDate: markets.endDate,
              qualityGrade: markets.qualityGrade,
              qualityScore: markets.qualityScore,
              clusterLabel: markets.clusterLabel,
            })
            .from(markets)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(markets.createdAt))
            .limit(limit)
            .offset(offset);
        }
      } else {
        // Standard sorting for other columns
        const orderColumn = {
          quality: markets.qualityScore,
          endDate: markets.endDate,
          createdAt: markets.createdAt,
        }[sortBy];

        marketRows = await db
          .select({
            id: markets.id,
            polymarketId: markets.polymarketId,
            question: markets.question,
            category: markets.category,
            endDate: markets.endDate,
            qualityGrade: markets.qualityGrade,
            qualityScore: markets.qualityScore,
            clusterLabel: markets.clusterLabel,
          })
          .from(markets)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderDir(orderColumn ?? markets.createdAt))
          .limit(limit)
          .offset(offset);
      }

      // Get latest snapshots for these markets using DISTINCT ON for better performance
      const marketIds = marketRows.map((m) => m.id);
      let snapshotMap = new Map<string, { price: string | null; volume24h: string | null; liquidity: string | null }>();

      if (marketIds.length > 0) {
        const snapshots = await db
          .select({
            marketId: marketSnapshots.marketId,
            price: marketSnapshots.price,
            volume24h: marketSnapshots.volume24h,
            liquidity: marketSnapshots.liquidity,
            snapshotAt: marketSnapshots.snapshotAt,
          })
          .from(marketSnapshots)
          .where(sql`${marketSnapshots.marketId} IN (${sql.join(marketIds.map(id => sql`${id}::uuid`), sql`, `)})`)
          .orderBy(desc(marketSnapshots.snapshotAt))
          .limit(marketIds.length * 2); // Get recent snapshots

        // Keep only the latest snapshot per market
        for (const s of snapshots) {
          if (!snapshotMap.has(s.marketId)) {
            snapshotMap.set(s.marketId, {
              price: s.price,
              volume24h: s.volume24h,
              liquidity: s.liquidity,
            });
          }
        }
      }

      // Also get metadata from markets for fallback
      const marketsWithMetadata = await db
        .select({
          id: markets.id,
          metadata: markets.metadata,
        })
        .from(markets)
        .where(sql`${markets.id} IN (${sql.join(marketIds.map(id => sql`${id}::uuid`), sql`, `)})`);

      const metadataMap = new Map<string, any>();
      for (const m of marketsWithMetadata) {
        if (m.metadata) {
          metadataMap.set(m.id, m.metadata);
        }
      }

      const data = marketRows.map((m) => {
        const snapshot = snapshotMap.get(m.id);
        const metadata = metadataMap.get(m.id) as { currentPrice?: number; volume24h?: number; liquidity?: number } | undefined;
        
        return {
          id: m.id,
          polymarketId: m.polymarketId,
          question: m.question,
          category: m.category,
          endDate: m.endDate?.toISOString() ?? null,
          qualityGrade: m.qualityGrade,
          qualityScore: m.qualityScore ? Number(m.qualityScore) : null,
          clusterLabel: m.clusterLabel,
          currentPrice: snapshot?.price ? Number(snapshot.price) : (metadata?.currentPrice ?? null),
          volume24h: snapshot?.volume24h ? Number(snapshot.volume24h) : (metadata?.volume24h ?? null),
          liquidity: snapshot?.liquidity ? Number(snapshot.liquidity) : (metadata?.liquidity ?? null),
        };
      });

      return {
        data,
        total,
        limit,
        offset,
      };
    }
  );

  // Get single market details
  typedApp.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: MarketResponseSchema.extend({
            description: z.string().nullable(),
            spread: z.number().nullable(),
            depth: z.number().nullable(),
            staleness: z.number().nullable(),
            qualityBreakdown: z
              .object({
                spreadScore: z.number(),
                depthScore: z.number(),
                stalenessScore: z.number(),
                volatilityScore: z.number(),
              })
              .nullable(),
            qualitySummary: z.string().nullable(),
            isLowQuality: z.boolean(),
            behaviorCluster: BehaviorClusterSchema.nullable(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Validate UUID format before querying
      if (!isValidUUID(id)) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      // Get latest snapshot
      const [snapshot] = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      const spreadScore = market.spreadScore ? Number(market.spreadScore) : null;
      const depthScore = market.depthScore ? Number(market.depthScore) : null;
      const stalenessScore = market.stalenessScore ? Number(market.stalenessScore) : null;
      const volatilityScore = market.volatilityScore ? Number(market.volatilityScore) : null;

      const hasBreakdown = spreadScore !== null && depthScore !== null;

      // Generate quality summary
      let qualitySummary: string | null = null;
      if (hasBreakdown) {
        const parts: string[] = [];
        if (spreadScore >= 80) parts.push("tight spreads");
        else if (spreadScore >= 50) parts.push("moderate spreads");
        else parts.push("wide spreads");

        if (depthScore >= 80) parts.push("deep liquidity");
        else if (depthScore >= 50) parts.push("adequate liquidity");
        else parts.push("thin liquidity");

        qualitySummary = `This market has ${parts.join(" and ")}.`;

        // Add slippage estimate
        const liquidity = snapshot?.liquidity ? Number(snapshot.liquidity) : null;
        const spread = snapshot?.spread ? Number(snapshot.spread) : null;
        if (liquidity && liquidity > 0 && spread !== null) {
          const tradeSize = 500;
          const spreadCost = tradeSize * (spread / 2);
          const marketImpact = (tradeSize / liquidity) * tradeSize * 0.5;
          const totalSlippage = spreadCost + marketImpact;
          if (totalSlippage > 1) {
            qualitySummary += ` A $${tradeSize} trade would cost ~$${Math.round(totalSlippage)} in slippage.`;
          }
        }
      }

      const isLowQuality = market.qualityGrade === "D" || market.qualityGrade === "F";

      // Get behavior cluster dimensions
      const [behaviorDims] = await db
        .select()
        .from(marketBehaviorDimensions)
        .where(eq(marketBehaviorDimensions.marketId, id))
        .limit(1);

      const behaviorCluster = behaviorDims ? {
        cluster: behaviorDims.behaviorCluster,
        confidence: behaviorDims.clusterConfidence,
        explanation: behaviorDims.clusterExplanation,
        dimensions: {
          infoCadence: behaviorDims.infoCadence,
          infoStructure: behaviorDims.infoStructure,
          liquidityStability: behaviorDims.liquidityStability,
          timeToResolution: behaviorDims.timeToResolution,
          participantConcentration: behaviorDims.participantConcentration,
        },
        retailInterpretation: behaviorDims.retailFriendliness ? {
          friendliness: behaviorDims.retailFriendliness,
          whatThisMeansForRetail: behaviorDims.behaviorCluster
            ? CLUSTER_RETAIL_INTERPRETATION[behaviorDims.behaviorCluster]?.whatThisMeansForRetail || ""
            : "",
          commonMistake: behaviorDims.commonRetailMistake || "",
          whyRetailLoses: behaviorDims.whyRetailLosesHere || "",
          whenRetailCanCompete: behaviorDims.whenRetailCanCompete || "",
        } : null,
      } : null;

      return {
        id: market.id,
        polymarketId: market.polymarketId,
        question: market.question,
        description: market.description,
        category: market.category,
        endDate: market.endDate?.toISOString() ?? null,
        qualityGrade: market.qualityGrade,
        qualityScore: market.qualityScore ? Number(market.qualityScore) : null,
        clusterLabel: market.clusterLabel,
        currentPrice: snapshot?.price ? Number(snapshot.price) : null,
        volume24h: snapshot?.volume24h ? Number(snapshot.volume24h) : null,
        liquidity: snapshot?.liquidity ? Number(snapshot.liquidity) : null,
        spread: snapshot?.spread ? Number(snapshot.spread) : null,
        depth: snapshot?.depth ? Number(snapshot.depth) : null,
        staleness: snapshot?.snapshotAt
          ? Math.floor((Date.now() - snapshot.snapshotAt.getTime()) / 1000 / 60)
          : null,
        qualityBreakdown: hasBreakdown
          ? {
              spreadScore: spreadScore!,
              depthScore: depthScore!,
              stalenessScore: stalenessScore ?? 50,
              volatilityScore: volatilityScore ?? 50,
            }
          : null,
        qualitySummary,
        isLowQuality,
        behaviorCluster,
      };
    }
  );

  // Get market price history
  typedApp.get(
    "/:id/history",
    {
      schema: {
        params: z.object({ id: z.string() }),
        querystring: z.object({
          period: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
        }),
        response: {
          200: z.object({
            marketId: z.string(),
            period: z.string(),
            snapshots: z.array(
              z.object({
                timestamp: z.string(),
                price: z.number(),
                volume: z.number(),
              })
            ),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { period } = request.query;

      // Validate UUID format before querying
      if (!isValidUUID(id)) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      const periodMs = {
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      }[period];

      const since = new Date(Date.now() - periodMs);

      const history = await db
        .select({
          snapshotAt: marketSnapshots.snapshotAt,
          price: marketSnapshots.price,
          volume24h: marketSnapshots.volume24h,
        })
        .from(marketSnapshots)
        .where(
          and(
            eq(marketSnapshots.marketId, id),
            gte(marketSnapshots.snapshotAt, since)
          )
        )
        .orderBy(asc(marketSnapshots.snapshotAt));

      return {
        marketId: id,
        period,
        snapshots: history.map((s) => ({
          timestamp: s.snapshotAt?.toISOString() ?? "",
          price: s.price ? Number(s.price) : 0,
          volume: s.volume24h ? Number(s.volume24h) : 0,
        })),
      };
    }
  );

  // Compute behavior cluster for a market
  typedApp.post(
    "/:id/compute-cluster",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: BehaviorClusterSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Get market
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get historical snapshots for analysis
      const snapshots = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(100);

      // Compute dimensions
      const now = new Date();
      const endDate = market.endDate;
      const hoursToResolution = endDate
        ? Math.max(0, (endDate.getTime() - now.getTime()) / (1000 * 60 * 60))
        : null;

      // Info cadence: How frequently does new info arrive? (0-100)
      // Sports = high cadence, long-term political = low
      let infoCadence = 50;
      const category = market.category?.toLowerCase() || "";
      if (category.includes("sports") || category.includes("nba") || category.includes("nfl")) {
        infoCadence = 90;
      } else if (category.includes("crypto") || category.includes("bitcoin")) {
        infoCadence = 80;
      } else if (category.includes("politics") || category.includes("election")) {
        infoCadence = 40;
      }

      // Info structure: Continuous vs discrete (0=continuous, 100=single event)
      let infoStructure = 50;
      if (hoursToResolution !== null && hoursToResolution < 24) {
        infoStructure = 90; // Binary event coming soon
      } else if (category.includes("sports")) {
        infoStructure = 95; // Sports are discrete events
      } else if (category.includes("will") && category.includes("2025")) {
        infoStructure = 70; // Year-end resolution
      }

      // Liquidity stability: How stable is liquidity? (from snapshots)
      let liquidityStability = 50;
      if (snapshots.length >= 5) {
        const liquidities = snapshots
          .map(s => s.liquidity ? Number(s.liquidity) : 0)
          .filter(l => l > 0);
        if (liquidities.length >= 3) {
          const avg = liquidities.reduce((a, b) => a + b, 0) / liquidities.length;
          const variance = liquidities.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / liquidities.length;
          const cv = Math.sqrt(variance) / avg; // Coefficient of variation
          liquidityStability = Math.max(0, Math.min(100, 100 - cv * 100));
        }
      }

      // Time to resolution (normalized 0-100, lower = sooner)
      let timeToResolution = 50;
      if (hoursToResolution !== null) {
        if (hoursToResolution < 24) timeToResolution = 10;
        else if (hoursToResolution < 168) timeToResolution = 30; // < 1 week
        else if (hoursToResolution < 720) timeToResolution = 50; // < 1 month
        else if (hoursToResolution < 2160) timeToResolution = 70; // < 3 months
        else timeToResolution = 90;
      }

      // Participant concentration: Estimate from volume patterns
      let participantConcentration = 50;
      if (snapshots.length >= 5) {
        const volumes = snapshots
          .map(s => s.volume24h ? Number(s.volume24h) : 0)
          .filter(v => v > 0);
        if (volumes.length >= 3) {
          const maxVol = Math.max(...volumes);
          const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
          // High max/avg ratio suggests concentrated activity
          participantConcentration = Math.min(100, (maxVol / avgVol) * 20);
        }
      }

      // Determine cluster based on dimensions
      let cluster: "scheduled_event" | "continuous_info" | "binary_catalyst" | "high_volatility" | "long_duration" | "sports_scheduled";
      let explanation: string;
      let confidence = 70;

      if (category.includes("sports") || category.includes("nba") || category.includes("nfl") || category.includes("soccer")) {
        cluster = "sports_scheduled";
        explanation = "Sports market with known event timing and binary outcome";
        confidence = 95;
      } else if (infoStructure > 80 && timeToResolution < 30) {
        cluster = "binary_catalyst";
        explanation = "Single event resolution approaching with binary outcome";
        confidence = 85;
      } else if (infoCadence > 70 && liquidityStability < 40) {
        cluster = "high_volatility";
        explanation = "Frequent information flow with unstable liquidity";
        confidence = 75;
      } else if (timeToResolution > 70) {
        cluster = "long_duration";
        explanation = "Long time to resolution, suitable for position building";
        confidence = 80;
      } else if (infoStructure > 60) {
        cluster = "scheduled_event";
        explanation = "Scheduled event with known timing (election, earnings, etc)";
        confidence = 70;
      } else {
        cluster = "continuous_info";
        explanation = "Ongoing information flow affects pricing continuously";
        confidence = 65;
      }

      // Get retail interpretation for this cluster
      const retailInterp = CLUSTER_RETAIL_INTERPRETATION[cluster] || {
        friendliness: "neutral" as const,
        whatThisMeansForRetail: "Market behavior analysis unavailable.",
        commonMistake: "Entering without understanding market structure.",
        whyRetailLoses: "Unknown market dynamics.",
        whenRetailCanCompete: "When you have done thorough research.",
      };

      // Upsert behavior dimensions
      await db
        .insert(marketBehaviorDimensions)
        .values({
          marketId: id,
          infoCadence: Math.round(infoCadence),
          infoStructure: Math.round(infoStructure),
          liquidityStability: Math.round(liquidityStability),
          timeToResolution: Math.round(timeToResolution),
          participantConcentration: Math.round(participantConcentration),
          behaviorCluster: cluster,
          clusterConfidence: confidence,
          clusterExplanation: explanation,
          retailFriendliness: retailInterp.friendliness,
          commonRetailMistake: retailInterp.commonMistake,
          whyRetailLosesHere: retailInterp.whyRetailLoses,
          whenRetailCanCompete: retailInterp.whenRetailCanCompete,
        })
        .onConflictDoUpdate({
          target: marketBehaviorDimensions.marketId,
          set: {
            infoCadence: Math.round(infoCadence),
            infoStructure: Math.round(infoStructure),
            liquidityStability: Math.round(liquidityStability),
            timeToResolution: Math.round(timeToResolution),
            participantConcentration: Math.round(participantConcentration),
            behaviorCluster: cluster,
            clusterConfidence: confidence,
            clusterExplanation: explanation,
            retailFriendliness: retailInterp.friendliness,
            commonRetailMistake: retailInterp.commonMistake,
            whyRetailLosesHere: retailInterp.whyRetailLoses,
            whenRetailCanCompete: retailInterp.whenRetailCanCompete,
            updatedAt: new Date(),
          },
        });

      return {
        cluster,
        confidence,
        explanation,
        dimensions: {
          infoCadence: Math.round(infoCadence),
          infoStructure: Math.round(infoStructure),
          liquidityStability: Math.round(liquidityStability),
          timeToResolution: Math.round(timeToResolution),
          participantConcentration: Math.round(participantConcentration),
        },
        retailInterpretation: {
          friendliness: retailInterp.friendliness,
          whatThisMeansForRetail: retailInterp.whatThisMeansForRetail,
          commonMistake: retailInterp.commonMistake,
          whyRetailLoses: retailInterp.whyRetailLoses,
          whenRetailCanCompete: retailInterp.whenRetailCanCompete,
        },
      };
    }
  );

  // Compute Flow Guard for a market
  typedApp.post(
    "/:id/compute-flow-guard",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: FlowGuardSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Get market
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get historical snapshots for flow analysis
      const snapshots = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(50);

      // Compute flow metrics
      // 1. Large early trades percentage - estimate from volume spikes early in market life
      let largeEarlyTradesPct = 0;
      if (snapshots.length >= 5) {
        const volumes = snapshots.map(s => Number(s.volume24h) || 0);
        const maxVol = Math.max(...volumes);
        const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        // Early concentration of volume suggests large early trades
        const earlyVolumes = volumes.slice(-5); // Oldest 5
        const earlyAvg = earlyVolumes.reduce((a, b) => a + b, 0) / earlyVolumes.length;
        largeEarlyTradesPct = avgVol > 0 ? Math.min(100, (earlyAvg / avgVol) * 100) : 50;
      }

      // 2. Order book concentration - estimate from liquidity variability
      let orderBookConcentration = 50;
      if (snapshots.length >= 3) {
        const liquidities = snapshots.map(s => Number(s.liquidity) || 0).filter(l => l > 0);
        if (liquidities.length >= 3) {
          const max = Math.max(...liquidities);
          const min = Math.min(...liquidities);
          const avg = liquidities.reduce((a, b) => a + b, 0) / liquidities.length;
          // Large variance in liquidity suggests concentration
          orderBookConcentration = avg > 0 ? Math.min(100, ((max - min) / avg) * 50) : 50;
        }
      }

      // 3. Depth shift speed - how quickly does depth change?
      let depthShiftSpeed = 0;
      if (snapshots.length >= 2) {
        const depths = snapshots.map(s => Number(s.depth) || 0);
        let totalShift = 0;
        for (let i = 1; i < depths.length; i++) {
          const prevDepth = depths[i-1]!;
          const currDepth = depths[i]!;
          if (prevDepth > 0) {
            totalShift += Math.abs(currDepth - prevDepth) / prevDepth;
          }
        }
        depthShiftSpeed = Math.min(100, (totalShift / (depths.length - 1)) * 100);
      }

      // 4. Repricing speed - how quickly do prices move?
      let repricingSpeed = 0;
      if (snapshots.length >= 2) {
        const prices = snapshots.map(s => Number(s.price) || 0.5);
        let totalMove = 0;
        for (let i = 1; i < prices.length; i++) {
          const prevPrice = prices[i-1]!;
          const currPrice = prices[i]!;
          totalMove += Math.abs(currPrice - prevPrice);
        }
        repricingSpeed = Math.min(100, (totalMove / (prices.length - 1)) * 500);
      }

      // Classify flow
      let label: "historically_noisy" | "pro_dominant" | "retail_actionable";
      let confidence: "low" | "medium" | "high";
      const whyBullets: Array<{ text: string; metric: string; value: number; unit: string }> = [];

      // Pro-dominant: high early trades, high concentration, fast repricing
      const proScore = (largeEarlyTradesPct * 0.3) + (orderBookConcentration * 0.3) + (repricingSpeed * 0.4);
      // Noisy: high variance but no clear pattern
      const noisyScore = (depthShiftSpeed * 0.5) + (Math.abs(50 - orderBookConcentration) * 0.5);

      if (proScore > 60) {
        label = "pro_dominant";
        confidence = proScore > 75 ? "high" : "medium";
        whyBullets.push(
          { text: "Early volume concentration", metric: "Large early trades", value: Math.round(largeEarlyTradesPct), unit: "%" },
          { text: "Order book shows concentration", metric: "Book concentration", value: Math.round(orderBookConcentration), unit: "score" },
          { text: "Fast price adjustments", metric: "Repricing speed", value: Math.round(repricingSpeed), unit: "score" }
        );
      } else if (noisyScore > 50 || snapshots.length < 10) {
        label = "historically_noisy";
        confidence = snapshots.length < 10 ? "low" : "medium";
        whyBullets.push(
          { text: "Depth changes frequently", metric: "Depth volatility", value: Math.round(depthShiftSpeed), unit: "score" },
          { text: "No clear flow pattern", metric: "Pattern clarity", value: Math.round(100 - noisyScore), unit: "score" },
          { text: "Insufficient history", metric: "Data points", value: snapshots.length, unit: "snapshots" }
        );
      } else {
        label = "retail_actionable";
        confidence = proScore < 30 ? "high" : "medium";
        whyBullets.push(
          { text: "Lower professional concentration", metric: "Pro activity", value: Math.round(proScore), unit: "score" },
          { text: "Stable order book", metric: "Book stability", value: Math.round(100 - orderBookConcentration), unit: "score" },
          { text: "Moderate repricing", metric: "Price stability", value: Math.round(100 - repricingSpeed), unit: "score" }
        );
      }

      const interp = FLOW_GUARD_INTERPRETATION[label];
      const commonRetailMistake = interp?.commonMistake || "Entering without understanding flow dynamics.";

      // Upsert flow guard
      await db
        .insert(retailFlowGuard)
        .values({
          marketId: id,
          label,
          confidence,
          whyBullets,
          commonRetailMistake,
          largeEarlyTradesPct: String(Math.round(largeEarlyTradesPct * 100) / 100),
          orderBookConcentration: String(Math.round(orderBookConcentration * 100) / 100),
          depthShiftSpeed: String(Math.round(depthShiftSpeed * 100) / 100),
          repricingSpeed: String(Math.round(repricingSpeed * 100) / 100),
        })
        .onConflictDoUpdate({
          target: retailFlowGuard.marketId,
          set: {
            label,
            confidence,
            whyBullets,
            commonRetailMistake,
            largeEarlyTradesPct: String(Math.round(largeEarlyTradesPct * 100) / 100),
            orderBookConcentration: String(Math.round(orderBookConcentration * 100) / 100),
            depthShiftSpeed: String(Math.round(depthShiftSpeed * 100) / 100),
            repricingSpeed: String(Math.round(repricingSpeed * 100) / 100),
            updatedAt: new Date(),
          },
        });

      return {
        label,
        confidence,
        whyBullets,
        commonRetailMistake,
        metrics: {
          largeEarlyTradesPct: Math.round(largeEarlyTradesPct * 100) / 100,
          orderBookConcentration: Math.round(orderBookConcentration * 100) / 100,
          depthShiftSpeed: Math.round(depthShiftSpeed * 100) / 100,
          repricingSpeed: Math.round(repricingSpeed * 100) / 100,
        },
      };
    }
  );

  // Get Flow Guard for a market
  typedApp.get(
    "/:id/flow-guard",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: FlowGuardSchema.extend({
            displayLabel: z.string(),
            severity: z.enum(["warning", "caution", "info"]),
            explanation: z.string(),
            disclaimer: z.string(),
          }).nullable(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      if (!isValidUUID(id)) {
        return reply.status(404).send({ error: `Market ${id} not found` });
      }

      const [guard] = await db
        .select()
        .from(retailFlowGuard)
        .where(eq(retailFlowGuard.marketId, id))
        .limit(1);

      if (!guard) {
        return null;
      }

      const interp = FLOW_GUARD_INTERPRETATION[guard.label] || {
        displayLabel: "Unknown",
        severity: "caution",
        explanation: "Flow analysis unavailable.",
        commonMistake: "Entering without understanding flow dynamics.",
      };

      return {
        label: guard.label,
        confidence: guard.confidence,
        whyBullets: guard.whyBullets as Array<{ text: string; metric?: string; value?: number; unit?: string }>,
        commonRetailMistake: guard.commonRetailMistake,
        displayLabel: interp.displayLabel,
        severity: interp.severity,
        explanation: interp.explanation,
        disclaimer: "Public on-chain data. Flow signals often disadvantage retail traders.",
        metrics: {
          largeEarlyTradesPct: guard.largeEarlyTradesPct ? Number(guard.largeEarlyTradesPct) : null,
          orderBookConcentration: guard.orderBookConcentration ? Number(guard.orderBookConcentration) : null,
          depthShiftSpeed: guard.depthShiftSpeed ? Number(guard.depthShiftSpeed) : null,
          repricingSpeed: guard.repricingSpeed ? Number(guard.repricingSpeed) : null,
        },
      };
    }
  );

  // ============================================
  // HIDDEN EXPOSURE DETECTOR ENDPOINTS
  // ============================================

  // Schema for hidden exposure response
  const HiddenExposureSchema = z.object({
    marketId: z.string(),
    linkedMarkets: z.array(z.object({
      marketId: z.string(),
      question: z.string(),
      exposureLabel: z.enum(["independent", "partially_linked", "highly_linked"]),
      explanation: z.string(),
      exampleOutcome: z.string(),
      mistakePrevented: z.string(),
      sharedDriverType: z.string(),
    })),
    totalLinked: z.number(),
    highlyLinkedCount: z.number(),
    warningLevel: z.enum(["none", "caution", "warning"]),
  });

  // Exposure interpretation
  const EXPOSURE_INTERPRETATION: Record<string, {
    warningTitle: string;
    severity: "none" | "caution" | "warning";
  }> = {
    independent: {
      warningTitle: "Markets resolve independently",
      severity: "none",
    },
    partially_linked: {
      warningTitle: "Partial overlap detected",
      severity: "caution",
    },
    highly_linked: {
      warningTitle: "These markets move together",
      severity: "warning",
    },
  };

  // Extract resolution drivers from market question/category
  function extractResolutionDrivers(market: { question: string; category: string | null; endDate: Date | null }) {
    const question = market.question.toLowerCase();
    const category = market.category?.toLowerCase() || "";

    // Detect underlying asset
    let underlyingAsset: string | null = null;
    let assetCategory: string | null = null;

    // Crypto assets
    const cryptoPatterns: Record<string, string> = {
      "bitcoin": "BTC", "btc": "BTC",
      "ethereum": "ETH", "eth": "ETH",
      "solana": "SOL", "sol": "SOL",
      "dogecoin": "DOGE", "doge": "DOGE",
      "xrp": "XRP", "ripple": "XRP",
    };
    for (const [pattern, asset] of Object.entries(cryptoPatterns)) {
      if (question.includes(pattern)) {
        underlyingAsset = asset;
        assetCategory = "crypto";
        break;
      }
    }

    // Political figures
    const politicalPatterns: Record<string, string> = {
      "trump": "Trump", "donald trump": "Trump",
      "biden": "Biden", "joe biden": "Biden",
      "harris": "Harris", "kamala": "Harris",
      "desantis": "DeSantis",
      "newsom": "Newsom",
    };
    if (!underlyingAsset) {
      for (const [pattern, asset] of Object.entries(politicalPatterns)) {
        if (question.includes(pattern)) {
          underlyingAsset = asset;
          assetCategory = "politics";
          break;
        }
      }
    }

    // Economic indicators
    const econPatterns: Record<string, string> = {
      "fed": "Fed", "federal reserve": "Fed", "interest rate": "Fed",
      "inflation": "Inflation", "cpi": "Inflation",
      "recession": "Recession", "gdp": "GDP",
      "unemployment": "Unemployment",
    };
    if (!underlyingAsset) {
      for (const [pattern, asset] of Object.entries(econPatterns)) {
        if (question.includes(pattern)) {
          underlyingAsset = asset;
          assetCategory = "economics";
          break;
        }
      }
    }

    // Events/Narrative
    let narrativeDependency: string | null = null;
    if (question.includes("election") || question.includes("vote")) {
      narrativeDependency = "election";
    } else if (question.includes("approve") || question.includes("approval")) {
      narrativeDependency = "approval_rating";
    } else if (question.includes("price") && assetCategory === "crypto") {
      narrativeDependency = "price_movement";
    } else if (question.includes("win") || question.includes("winner")) {
      narrativeDependency = "competition_outcome";
    }

    // Resolution source
    let resolutionSource: string | null = null;
    if (assetCategory === "crypto") {
      resolutionSource = "exchange_price";
    } else if (assetCategory === "politics") {
      resolutionSource = "official_results";
    } else if (category.includes("sports")) {
      resolutionSource = "game_result";
    }

    return {
      underlyingAsset,
      assetCategory,
      narrativeDependency,
      resolutionSource,
      resolutionWindowStart: market.endDate ? new Date(market.endDate.getTime() - 24 * 60 * 60 * 1000) : null,
      resolutionWindowEnd: market.endDate,
    };
  }

  // Classify exposure between two markets
  function classifyExposure(driversA: ReturnType<typeof extractResolutionDrivers>, driversB: ReturnType<typeof extractResolutionDrivers>, questionA: string, questionB: string): {
    label: "independent" | "partially_linked" | "highly_linked";
    explanation: string;
    exampleOutcome: string;
    mistakePrevented: string;
    sharedDriverType: string;
  } {
    // Check for same underlying asset
    if (driversA.underlyingAsset && driversA.underlyingAsset === driversB.underlyingAsset) {
      // Same asset = highly linked
      return {
        label: "highly_linked",
        explanation: `Both markets depend on ${driversA.underlyingAsset}. If one moves, the other likely moves the same way.`,
        exampleOutcome: `If ${driversA.underlyingAsset} surges, both of these bets could win or lose together.`,
        mistakePrevented: "Thinking you're diversified when you're actually doubling down on the same outcome.",
        sharedDriverType: "asset",
      };
    }

    // Check for same narrative dependency
    if (driversA.narrativeDependency && driversA.narrativeDependency === driversB.narrativeDependency) {
      return {
        label: "highly_linked",
        explanation: `Both markets are driven by the same event or narrative.`,
        exampleOutcome: `The same news could resolve both markets in the same direction.`,
        mistakePrevented: "Betting on the same story multiple times without realizing it.",
        sharedDriverType: "narrative",
      };
    }

    // Check for same asset category with time overlap
    if (driversA.assetCategory && driversA.assetCategory === driversB.assetCategory) {
      // Check time window overlap
      const hasTimeOverlap = driversA.resolutionWindowEnd && driversB.resolutionWindowEnd &&
        driversA.resolutionWindowStart && driversB.resolutionWindowStart &&
        driversA.resolutionWindowStart <= driversB.resolutionWindowEnd &&
        driversB.resolutionWindowStart <= driversA.resolutionWindowEnd;

      if (hasTimeOverlap) {
        return {
          label: "partially_linked",
          explanation: `Both markets are in the ${driversA.assetCategory} category and resolve around the same time.`,
          exampleOutcome: `A major ${driversA.assetCategory} event could affect both markets at once.`,
          mistakePrevented: "Ignoring sector-wide risks that could hit multiple positions.",
          sharedDriverType: "category_time",
        };
      }

      return {
        label: "partially_linked",
        explanation: `Both markets are in the ${driversA.assetCategory} sector and may be influenced by similar forces.`,
        exampleOutcome: `Sector-wide trends could push both in the same direction.`,
        mistakePrevented: "Over-concentrating in one sector without seeing the pattern.",
        sharedDriverType: "category",
      };
    }

    // Check resolution source
    if (driversA.resolutionSource && driversA.resolutionSource === driversB.resolutionSource) {
      return {
        label: "partially_linked",
        explanation: `Both markets resolve based on the same type of data source.`,
        exampleOutcome: `If the resolution source has issues or delays, both markets are affected.`,
        mistakePrevented: "Not realizing your bets share resolution infrastructure.",
        sharedDriverType: "resolution_source",
      };
    }

    return {
      label: "independent",
      explanation: "These markets appear to resolve based on different factors.",
      exampleOutcome: "One market's outcome shouldn't directly affect the other.",
      mistakePrevented: "",
      sharedDriverType: "none",
    };
  }

  // Compute resolution drivers for a market
  typedApp.post(
    "/:id/compute-drivers",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            marketId: z.string(),
            underlyingAsset: z.string().nullable(),
            assetCategory: z.string().nullable(),
            narrativeDependency: z.string().nullable(),
            resolutionSource: z.string().nullable(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      const drivers = extractResolutionDrivers({
        question: market.question,
        category: market.category,
        endDate: market.endDate,
      });

      // Upsert drivers
      await db
        .insert(marketResolutionDrivers)
        .values({
          marketId: id,
          underlyingAsset: drivers.underlyingAsset,
          assetCategory: drivers.assetCategory,
          narrativeDependency: drivers.narrativeDependency,
          resolutionSource: drivers.resolutionSource,
          resolutionWindowStart: drivers.resolutionWindowStart,
          resolutionWindowEnd: drivers.resolutionWindowEnd,
        })
        .onConflictDoUpdate({
          target: marketResolutionDrivers.marketId,
          set: {
            underlyingAsset: drivers.underlyingAsset,
            assetCategory: drivers.assetCategory,
            narrativeDependency: drivers.narrativeDependency,
            resolutionSource: drivers.resolutionSource,
            resolutionWindowStart: drivers.resolutionWindowStart,
            resolutionWindowEnd: drivers.resolutionWindowEnd,
            computedAt: new Date(),
          },
        });

      return {
        marketId: id,
        underlyingAsset: drivers.underlyingAsset,
        assetCategory: drivers.assetCategory,
        narrativeDependency: drivers.narrativeDependency,
        resolutionSource: drivers.resolutionSource,
      };
    }
  );

  // Get hidden exposure links for a market
  typedApp.get(
    "/:id/hidden-exposure",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: HiddenExposureSchema,
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
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get existing links
      const links = await db
        .select({
          id: hiddenExposureLinks.id,
          marketAId: hiddenExposureLinks.marketAId,
          marketBId: hiddenExposureLinks.marketBId,
          exposureLabel: hiddenExposureLinks.exposureLabel,
          explanation: hiddenExposureLinks.explanation,
          exampleOutcome: hiddenExposureLinks.exampleOutcome,
          mistakePrevented: hiddenExposureLinks.mistakePrevented,
          sharedDriverType: hiddenExposureLinks.sharedDriverType,
        })
        .from(hiddenExposureLinks)
        .where(
          sql`${hiddenExposureLinks.marketAId} = ${id}::uuid OR ${hiddenExposureLinks.marketBId} = ${id}::uuid`
        );

      // Get linked market details
      const linkedMarketIds = links.map(l => l.marketAId === id ? l.marketBId : l.marketAId);

      let linkedMarketsData: Array<{ id: string; question: string }> = [];
      if (linkedMarketIds.length > 0) {
        linkedMarketsData = await db
          .select({ id: markets.id, question: markets.question })
          .from(markets)
          .where(sql`${markets.id} IN (${sql.join(linkedMarketIds.map(mid => sql`${mid}::uuid`), sql`, `)})`);
      }

      const linkedMarketsMap = new Map(linkedMarketsData.map(m => [m.id, m.question]));

      const linkedMarkets = links.map(link => {
        const linkedId = link.marketAId === id ? link.marketBId : link.marketAId;
        return {
          marketId: linkedId,
          question: linkedMarketsMap.get(linkedId) || "Unknown market",
          exposureLabel: link.exposureLabel,
          explanation: link.explanation,
          exampleOutcome: link.exampleOutcome,
          mistakePrevented: link.mistakePrevented,
          sharedDriverType: link.sharedDriverType,
        };
      });

      const highlyLinkedCount = linkedMarkets.filter(m => m.exposureLabel === "highly_linked").length;
      const partiallyLinkedCount = linkedMarkets.filter(m => m.exposureLabel === "partially_linked").length;

      let warningLevel: "none" | "caution" | "warning" = "none";
      if (highlyLinkedCount > 0) {
        warningLevel = "warning";
      } else if (partiallyLinkedCount > 0) {
        warningLevel = "caution";
      }

      return {
        marketId: id,
        linkedMarkets,
        totalLinked: linkedMarkets.length,
        highlyLinkedCount,
        warningLevel,
      };
    }
  );

  // Compute hidden exposure links for a market against all others
  typedApp.post(
    "/:id/compute-exposure",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            marketId: z.string(),
            linksCreated: z.number(),
            highlyLinked: z.number(),
            partiallyLinked: z.number(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get drivers for this market
      const driversA = extractResolutionDrivers({
        question: market.question,
        category: market.category,
        endDate: market.endDate,
      });

      // Store drivers
      await db
        .insert(marketResolutionDrivers)
        .values({
          marketId: id,
          underlyingAsset: driversA.underlyingAsset,
          assetCategory: driversA.assetCategory,
          narrativeDependency: driversA.narrativeDependency,
          resolutionSource: driversA.resolutionSource,
          resolutionWindowStart: driversA.resolutionWindowStart,
          resolutionWindowEnd: driversA.resolutionWindowEnd,
        })
        .onConflictDoUpdate({
          target: marketResolutionDrivers.marketId,
          set: {
            underlyingAsset: driversA.underlyingAsset,
            assetCategory: driversA.assetCategory,
            narrativeDependency: driversA.narrativeDependency,
            resolutionSource: driversA.resolutionSource,
            resolutionWindowStart: driversA.resolutionWindowStart,
            resolutionWindowEnd: driversA.resolutionWindowEnd,
            computedAt: new Date(),
          },
        });

      // Get other markets with resolved=false
      const otherMarkets = await db
        .select({
          id: markets.id,
          question: markets.question,
          category: markets.category,
          endDate: markets.endDate,
        })
        .from(markets)
        .where(sql`${markets.id} != ${id}::uuid AND ${markets.resolved} = false`)
        .limit(200);

      let linksCreated = 0;
      let highlyLinked = 0;
      let partiallyLinked = 0;

      for (const otherMarket of otherMarkets) {
        const driversB = extractResolutionDrivers({
          question: otherMarket.question,
          category: otherMarket.category,
          endDate: otherMarket.endDate,
        });

        const exposure = classifyExposure(driversA, driversB, market.question, otherMarket.question);

        // Only store non-independent links
        if (exposure.label !== "independent") {
          // Check if link already exists
          const existingLink = await db
            .select({ id: hiddenExposureLinks.id })
            .from(hiddenExposureLinks)
            .where(
              sql`(${hiddenExposureLinks.marketAId} = ${id}::uuid AND ${hiddenExposureLinks.marketBId} = ${otherMarket.id}::uuid)
                OR (${hiddenExposureLinks.marketAId} = ${otherMarket.id}::uuid AND ${hiddenExposureLinks.marketBId} = ${id}::uuid)`
            )
            .limit(1);

          if (existingLink.length === 0) {
            await db.insert(hiddenExposureLinks).values({
              marketAId: id,
              marketBId: otherMarket.id,
              exposureLabel: exposure.label,
              explanation: exposure.explanation,
              exampleOutcome: exposure.exampleOutcome,
              mistakePrevented: exposure.mistakePrevented,
              sharedDriverType: exposure.sharedDriverType,
            });
            linksCreated++;
          }

          if (exposure.label === "highly_linked") {
            highlyLinked++;
          } else if (exposure.label === "partially_linked") {
            partiallyLinked++;
          }
        }
      }

      return {
        marketId: id,
        linksCreated,
        highlyLinked,
        partiallyLinked,
      };
    }
  );

  // ============================================
  // PARTICIPATION STRUCTURE ENDPOINTS
  // ============================================

  // Schema for participation structure
  const ParticipationStructureSchema = z.object({
    side: z.enum(["YES", "NO"]),
    setupQualityScore: z.number(),
    setupQualityBand: z.enum(["historically_favorable", "mixed_workable", "neutral", "historically_unforgiving"]),
    participantQualityScore: z.number(),
    participantQualityBand: z.enum(["strong", "moderate", "limited"]),
    participationSummary: z.enum(["few_dominant", "mixed_participation", "broad_retail"]),
    breakdown: z.object({
      largePct: z.number(),
      midPct: z.number(),
      smallPct: z.number(),
    }),
    behaviorInsight: z.string(),
  });

  // Display info for Setup Quality bands
  const SETUP_QUALITY_DISPLAY: Record<string, { label: string; description: string; color: string }> = {
    historically_favorable: {
      label: "Historically Favorable",
      description: "Markets with similar structure have historically shown orderly trading conditions.",
      color: "emerald",
    },
    mixed_workable: {
      label: "Mixed but Workable",
      description: "Structure has shown mixed historical behavior but generally supports trading.",
      color: "yellow",
    },
    neutral: {
      label: "Neutral Structure",
      description: "Typical structure with no strong historical patterns.",
      color: "gray",
    },
    historically_unforgiving: {
      label: "Historically Challenging",
      description: "Markets with similar structure have historically shown challenging conditions.",
      color: "red",
    },
  };

  // Display info for Participant Quality bands
  const PARTICIPANT_QUALITY_DISPLAY: Record<string, { label: string; description: string; color: string }> = {
    strong: {
      label: "Strong Participation",
      description: "Significant activity from experienced participants.",
      color: "emerald",
    },
    moderate: {
      label: "Moderate Participation",
      description: "Mix of participant experience levels.",
      color: "yellow",
    },
    limited: {
      label: "Limited Participation",
      description: "Few experienced participants active on this side.",
      color: "gray",
    },
  };

  // Behavior insights - describe patterns, NOT outcomes
  const BEHAVIOR_INSIGHTS: Record<string, Record<string, string>> = {
    few_dominant: {
      historically_favorable: "Concentrated markets with stable liquidity have historically shown orderly price discovery.",
      mixed_workable: "Markets with dominant participants can reprice quickly when new information arrives.",
      neutral: "Concentration patterns in this market are typical for its category.",
      historically_unforgiving: "Markets with few large participants historically show wider spreads and less predictable fills.",
    },
    mixed_participation: {
      historically_favorable: "Balanced participation has historically supported stable trading conditions.",
      mixed_workable: "Mixed participation typically provides adequate liquidity for moderate-sized orders.",
      neutral: "Participation structure is unremarkable for this market type.",
      historically_unforgiving: "Mixed structures with low liquidity have historically shown execution challenges.",
    },
    broad_retail: {
      historically_favorable: "Broad participation has historically provided deep liquidity and tight spreads.",
      mixed_workable: "Retail-heavy markets can experience volume-driven price moves.",
      neutral: "Participation breadth is typical for retail-accessible markets.",
      historically_unforgiving: "Retail-dominated markets with low quality metrics have historically shown choppy price action.",
    },
  };

  // Compute participation structure for a market
  typedApp.post(
    "/:id/compute-participation",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            marketId: z.string(),
            yes: ParticipationStructureSchema,
            no: ParticipationStructureSchema,
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Get market
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get latest snapshot for metrics
      const [snapshot] = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      // Get historical snapshots for stability calculations
      const historicalSnapshots = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(20);

      // Compute liquidity stability from historical data
      let liquidityStability = 50;
      if (historicalSnapshots.length >= 3) {
        const liquidities = historicalSnapshots
          .map(s => s.liquidity ? Number(s.liquidity) : 0)
          .filter(l => l > 0);
        if (liquidities.length >= 3) {
          const avg = liquidities.reduce((a, b) => a + b, 0) / liquidities.length;
          const variance = liquidities.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / liquidities.length;
          const cv = Math.sqrt(variance) / avg;
          liquidityStability = Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
        }
      }

      // Compute price stability
      let priceStability = 50;
      if (historicalSnapshots.length >= 3) {
        const prices = historicalSnapshots
          .map(s => s.price ? Number(s.price) : 0)
          .filter(p => p > 0);
        if (prices.length >= 3) {
          let totalMove = 0;
          for (let i = 1; i < prices.length; i++) {
            totalMove += Math.abs(prices[i]! - prices[i-1]!);
          }
          const avgMove = totalMove / (prices.length - 1);
          priceStability = Math.max(0, Math.min(100, Math.round(100 - avgMove * 500)));
        }
      }

      // Compute Setup Quality Score
      function computeSetupQualityScore(liquidity: number | null, spread: number | null, volume: number | null, depth: number | null): number {
        let score = 50;

        // Liquidity (0-25 points)
        if (liquidity !== null && liquidity > 0) {
          if (liquidity > 100000) score += 25;
          else if (liquidity > 50000) score += 20;
          else if (liquidity > 20000) score += 15;
          else if (liquidity > 5000) score += 10;
          else score += 5;
        }

        // Spread (-15 to +15 points)
        if (spread !== null) {
          if (spread < 0.01) score += 15;
          else if (spread < 0.02) score += 10;
          else if (spread < 0.05) score += 5;
          else if (spread > 0.1) score -= 15;
          else if (spread > 0.05) score -= 5;
        }

        // Volume (0-15 points)
        if (volume !== null && volume > 0) {
          if (volume > 50000) score += 15;
          else if (volume > 10000) score += 10;
          else if (volume > 1000) score += 5;
        }

        // Liquidity stability (0-15 points)
        score += Math.floor(liquidityStability * 0.15);

        // Depth (0-10 points)
        if (depth !== null && depth > 0) {
          if (depth > 50000) score += 10;
          else if (depth > 20000) score += 7;
          else if (depth > 5000) score += 4;
        }

        // Price stability (-10 to +10)
        score += Math.floor((priceStability - 50) * 0.2);

        return Math.max(0, Math.min(100, Math.round(score)));
      }

      // Compute Participant Quality Score (estimates)
      function computeParticipantQualityScore(liquidity: number | null, volume: number | null): number {
        let score = 50;

        // Volume suggests more participant activity
        if (volume !== null && volume > 0) {
          if (volume > 100000) score += 30;
          else if (volume > 25000) score += 20;
          else if (volume > 5000) score += 10;
        }

        // Liquidity correlates with participant quality
        if (liquidity !== null && liquidity > 0) {
          if (liquidity > 100000) score += 20;
          else if (liquidity > 50000) score += 15;
          else if (liquidity > 20000) score += 10;
        }

        return Math.max(0, Math.min(100, Math.round(score)));
      }

      // Classify bands
      function classifySetupBand(score: number): "historically_favorable" | "mixed_workable" | "neutral" | "historically_unforgiving" {
        if (score >= 80) return "historically_favorable";
        if (score >= 60) return "mixed_workable";
        if (score >= 40) return "neutral";
        return "historically_unforgiving";
      }

      function classifyParticipantBand(score: number): "strong" | "moderate" | "limited" {
        if (score >= 70) return "strong";
        if (score >= 45) return "moderate";
        return "limited";
      }

      // Estimate participation breakdown (without real wallet data, use heuristics)
      function estimateBreakdown(volume: number | null): { largePct: number; midPct: number; smallPct: number; summary: "few_dominant" | "mixed_participation" | "broad_retail" } {
        // Default distribution
        let largePct = 30;
        let midPct = 40;
        let smallPct = 30;

        // Adjust based on volume (higher volume tends to have more institutional activity)
        if (volume !== null) {
          if (volume > 100000) {
            largePct = 45;
            midPct = 35;
            smallPct = 20;
          } else if (volume > 25000) {
            largePct = 35;
            midPct = 40;
            smallPct = 25;
          } else if (volume < 1000) {
            largePct = 15;
            midPct = 30;
            smallPct = 55;
          }
        }

        let summary: "few_dominant" | "mixed_participation" | "broad_retail" = "mixed_participation";
        if (largePct >= 45) summary = "few_dominant";
        else if (smallPct >= 50) summary = "broad_retail";

        return { largePct, midPct, smallPct, summary };
      }

      // Compute for YES side
      const liquidity = snapshot?.liquidity ? Number(snapshot.liquidity) : null;
      const spread = snapshot?.spread ? Number(snapshot.spread) : null;
      const volume = snapshot?.volume24h ? Number(snapshot.volume24h) : null;
      const depth = snapshot?.depth ? Number(snapshot.depth) : null;

      const yesSetupScore = computeSetupQualityScore(liquidity, spread, volume, depth);
      const yesParticipantScore = computeParticipantQualityScore(liquidity, volume);
      const yesSetupBand = classifySetupBand(yesSetupScore);
      const yesParticipantBand = classifyParticipantBand(yesParticipantScore);
      const yesBreakdown = estimateBreakdown(volume);

      // For NO side, apply slight variance
      const noSetupScore = Math.max(0, Math.min(100, yesSetupScore + Math.floor((Math.random() - 0.5) * 10)));
      const noParticipantScore = Math.max(0, Math.min(100, yesParticipantScore + Math.floor((Math.random() - 0.5) * 15)));
      const noSetupBand = classifySetupBand(noSetupScore);
      const noParticipantBand = classifyParticipantBand(noParticipantScore);
      const noBreakdown = estimateBreakdown(volume);

      const yesInsight = BEHAVIOR_INSIGHTS[yesBreakdown.summary]?.[yesSetupBand] || "No specific insight available.";
      const noInsight = BEHAVIOR_INSIGHTS[noBreakdown.summary]?.[noSetupBand] || "No specific insight available.";

      // Delete existing records for this market and insert fresh
      await db
        .delete(marketParticipationStructure)
        .where(eq(marketParticipationStructure.marketId, id));

      // Insert YES side
      await db
        .insert(marketParticipationStructure)
        .values({
          marketId: id,
          side: "YES",
          setupQualityScore: yesSetupScore,
          setupQualityBand: yesSetupBand,
          participantQualityScore: yesParticipantScore,
          participantQualityBand: yesParticipantBand,
          participationSummary: yesBreakdown.summary,
          largePct: yesBreakdown.largePct,
          midPct: yesBreakdown.midPct,
          smallPct: yesBreakdown.smallPct,
          behaviorInsight: yesInsight,
        });

      // Insert NO side
      await db
        .insert(marketParticipationStructure)
        .values({
          marketId: id,
          side: "NO",
          setupQualityScore: noSetupScore,
          setupQualityBand: noSetupBand,
          participantQualityScore: noParticipantScore,
          participantQualityBand: noParticipantBand,
          participationSummary: noBreakdown.summary,
          largePct: noBreakdown.largePct,
          midPct: noBreakdown.midPct,
          smallPct: noBreakdown.smallPct,
          behaviorInsight: noInsight,
        });

      return {
        marketId: id,
        yes: {
          side: "YES" as const,
          setupQualityScore: yesSetupScore,
          setupQualityBand: yesSetupBand,
          participantQualityScore: yesParticipantScore,
          participantQualityBand: yesParticipantBand,
          participationSummary: yesBreakdown.summary,
          breakdown: {
            largePct: yesBreakdown.largePct,
            midPct: yesBreakdown.midPct,
            smallPct: yesBreakdown.smallPct,
          },
          behaviorInsight: yesInsight,
        },
        no: {
          side: "NO" as const,
          setupQualityScore: noSetupScore,
          setupQualityBand: noSetupBand,
          participantQualityScore: noParticipantScore,
          participantQualityBand: noParticipantBand,
          participationSummary: noBreakdown.summary,
          breakdown: {
            largePct: noBreakdown.largePct,
            midPct: noBreakdown.midPct,
            smallPct: noBreakdown.smallPct,
          },
          behaviorInsight: noInsight,
        },
      };
    }
  );

  // Get participation structure for a market
  typedApp.get(
    "/:id/participation",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({
            marketId: z.string(),
            yes: ParticipationStructureSchema.extend({
              displayInfo: z.object({
                setupQuality: z.object({
                  label: z.string(),
                  description: z.string(),
                  color: z.string(),
                }),
                participantQuality: z.object({
                  label: z.string(),
                  description: z.string(),
                  color: z.string(),
                }),
              }),
            }).nullable(),
            no: ParticipationStructureSchema.extend({
              displayInfo: z.object({
                setupQuality: z.object({
                  label: z.string(),
                  description: z.string(),
                  color: z.string(),
                }),
                participantQuality: z.object({
                  label: z.string(),
                  description: z.string(),
                  color: z.string(),
                }),
              }),
            }).nullable(),
            disclaimer: z.string(),
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

      // Get participation data for both sides
      const participation = await db
        .select()
        .from(marketParticipationStructure)
        .where(eq(marketParticipationStructure.marketId, id));

      const yesData = participation.find(p => p.side === "YES");
      const noData = participation.find(p => p.side === "NO");

      const defaultSetupDisplay = { label: "Neutral Structure", description: "Typical structure with no strong historical patterns.", color: "gray" };
      const defaultParticipantDisplay = { label: "Moderate Participation", description: "Mix of participant experience levels.", color: "yellow" };

      const formatSide = (data: typeof yesData) => {
        if (!data) return null;

        const setupDisplay = SETUP_QUALITY_DISPLAY[data.setupQualityBand] ?? defaultSetupDisplay;
        const participantDisplay = PARTICIPANT_QUALITY_DISPLAY[data.participantQualityBand] ?? defaultParticipantDisplay;

        return {
          side: data.side as "YES" | "NO",
          setupQualityScore: data.setupQualityScore,
          setupQualityBand: data.setupQualityBand,
          participantQualityScore: data.participantQualityScore,
          participantQualityBand: data.participantQualityBand,
          participationSummary: data.participationSummary,
          breakdown: {
            largePct: data.largePct,
            midPct: data.midPct,
            smallPct: data.smallPct,
          },
          behaviorInsight: data.behaviorInsight,
          displayInfo: {
            setupQuality: setupDisplay,
            participantQuality: participantDisplay,
          },
        };
      };

      return {
        marketId: id,
        yes: formatSide(yesData),
        no: formatSide(noData),
        disclaimer: "Scores describe historical structural patterns, not predictions. Past behavior does not guarantee future results.",
      };
    }
  );

  // Get markets with interesting participation structures (for carousel)
  typedApp.get(
    "/structurally-interesting",
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().min(1).max(20).default(8),
        }),
        response: {
          200: z.array(z.object({
            marketId: z.string(),
            question: z.string(),
            category: z.string().nullable(),
            currentPrice: z.number().nullable(),
            setupQualityScore: z.number(),
            setupQualityBand: z.string(),
            participantQualityScore: z.number(),
            participantQualityBand: z.string(),
            participationSummary: z.string(),
            behaviorInsight: z.string(),
            interestingReason: z.string(),
          })),
        },
      },
    },
    async (request) => {
      const { limit } = request.query;

      // Find markets with interesting structures:
      // 1. High setup quality with strong participation (best conditions)
      // 2. High setup quality with limited participation (opportunity?)
      // 3. Few dominant participants with historically favorable (concentration plays)

      const structures = await db
        .select({
          id: marketParticipationStructure.id,
          marketId: marketParticipationStructure.marketId,
          side: marketParticipationStructure.side,
          setupQualityScore: marketParticipationStructure.setupQualityScore,
          setupQualityBand: marketParticipationStructure.setupQualityBand,
          participantQualityScore: marketParticipationStructure.participantQualityScore,
          participantQualityBand: marketParticipationStructure.participantQualityBand,
          participationSummary: marketParticipationStructure.participationSummary,
          behaviorInsight: marketParticipationStructure.behaviorInsight,
        })
        .from(marketParticipationStructure)
        .where(eq(marketParticipationStructure.side, "YES")) // Use YES side as primary
        .orderBy(desc(marketParticipationStructure.setupQualityScore))
        .limit(50);

      if (structures.length === 0) {
        return [];
      }

      // Score interestingness
      const scored = structures.map(s => {
        let interestScore = 0;
        let reason = "";

        // High setup quality is always interesting
        if (s.setupQualityScore >= 80) {
          interestScore += 30;
          if (s.participantQualityBand === "strong") {
            interestScore += 20;
            reason = "Strong structural conditions with experienced participation.";
          } else if (s.participantQualityBand === "limited") {
            interestScore += 15;
            reason = "Favorable structure with less crowded participation.";
          } else {
            reason = "Historically favorable market structure.";
          }
        }

        // Concentrated + favorable is interesting
        if (s.participationSummary === "few_dominant" && s.setupQualityBand === "historically_favorable") {
          interestScore += 20;
          reason = "Concentrated participation with orderly historical behavior.";
        }

        // High participant quality always interesting
        if (s.participantQualityScore >= 80) {
          interestScore += 15;
          if (!reason) reason = "High activity from experienced participants.";
        }

        return { ...s, interestScore, reason };
      })
        .filter(s => s.interestScore > 0)
        .sort((a, b) => b.interestScore - a.interestScore)
        .slice(0, limit);

      // Get market details
      const marketIds = scored.map(s => s.marketId);
      if (marketIds.length === 0) return [];

      const marketData = await db
        .select({
          id: markets.id,
          question: markets.question,
          category: markets.category,
        })
        .from(markets)
        .where(sql`${markets.id} IN (${sql.join(marketIds.map(mid => sql`${mid}::uuid`), sql`, `)})`);

      // Get latest prices
      const snapshots = await db
        .select({
          marketId: marketSnapshots.marketId,
          price: marketSnapshots.price,
        })
        .from(marketSnapshots)
        .where(sql`${marketSnapshots.marketId} IN (${sql.join(marketIds.map(mid => sql`${mid}::uuid`), sql`, `)})`)
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(marketIds.length * 2);

      const priceMap = new Map<string, number>();
      for (const s of snapshots) {
        if (!priceMap.has(s.marketId)) {
          priceMap.set(s.marketId, s.price ? Number(s.price) : 0.5);
        }
      }

      const marketMap = new Map(marketData.map(m => [m.id, m]));

      return scored.map(s => {
        const market = marketMap.get(s.marketId);
        return {
          marketId: s.marketId,
          question: market?.question || "Unknown market",
          category: market?.category || null,
          currentPrice: priceMap.get(s.marketId) ?? null,
          setupQualityScore: s.setupQualityScore,
          setupQualityBand: s.setupQualityBand,
          participantQualityScore: s.participantQualityScore,
          participantQualityBand: s.participantQualityBand,
          participationSummary: s.participationSummary,
          behaviorInsight: s.behaviorInsight,
          interestingReason: s.reason,
        };
      });
    }
  );
};
