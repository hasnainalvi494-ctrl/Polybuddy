import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots, marketBehaviorDimensions } from "@polybuddy/db";
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

      // For volume sorting, use a different strategy to avoid slow correlated subquery
      if (sortBy === "volume") {
        // Get markets with their latest volume in a single optimized query
        const volumeResults = await db.execute<{ market_id: string; volume_24h: string }>(sql`
          SELECT DISTINCT ON (market_id) market_id, volume_24h
          FROM market_snapshots
          WHERE volume_24h IS NOT NULL
          ORDER BY market_id, snapshot_at DESC
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

      const data = marketRows.map((m) => {
        const snapshot = snapshotMap.get(m.id);
        return {
          id: m.id,
          polymarketId: m.polymarketId,
          question: m.question,
          category: m.category,
          endDate: m.endDate?.toISOString() ?? null,
          qualityGrade: m.qualityGrade,
          qualityScore: m.qualityScore ? Number(m.qualityScore) : null,
          clusterLabel: m.clusterLabel,
          currentPrice: snapshot?.price ? Number(snapshot.price) : null,
          volume24h: snapshot?.volume24h ? Number(snapshot.volume24h) : null,
          liquidity: snapshot?.liquidity ? Number(snapshot.liquidity) : null,
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
      const retailInterp = CLUSTER_RETAIL_INTERPRETATION[cluster];

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
};
