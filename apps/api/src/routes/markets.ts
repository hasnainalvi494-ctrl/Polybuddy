import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots } from "@polybuddy/db";
import { eq, desc, asc, ilike, sql, and, gte } from "drizzle-orm";

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

      // Build order by
      const orderColumn = {
        volume: sql`(SELECT volume_24h FROM market_snapshots WHERE market_id = markets.id ORDER BY snapshot_at DESC LIMIT 1)`,
        quality: markets.qualityScore,
        endDate: markets.endDate,
        createdAt: markets.createdAt,
      }[sortBy];

      const orderDir = sortOrder === "asc" ? asc : desc;

      // Get markets with latest snapshot data
      const marketRows = await db
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
};
