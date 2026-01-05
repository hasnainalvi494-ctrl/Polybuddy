import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, watchlists, watchlistMarkets, markets, marketSnapshots } from "@polybuddy/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const WatchlistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  marketCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
});

export const watchlistsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List user's watchlists
  typedApp.get(
    "/",
    {
      schema: {
        response: {
          200: z.array(WatchlistSchema),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;

      const userWatchlists = await db
        .select({
          id: watchlists.id,
          name: watchlists.name,
          createdAt: watchlists.createdAt,
          updatedAt: watchlists.updatedAt,
          marketCount: sql<string>`COUNT(${watchlistMarkets.marketId})::text`,
        })
        .from(watchlists)
        .leftJoin(watchlistMarkets, eq(watchlists.id, watchlistMarkets.watchlistId))
        .where(eq(watchlists.userId, userId))
        .groupBy(watchlists.id, watchlists.name, watchlists.createdAt, watchlists.updatedAt)
        .orderBy(desc(watchlists.updatedAt));

      return userWatchlists.map((w) => ({
        id: w.id,
        name: w.name,
        marketCount: parseInt(w.marketCount || "0", 10),
        createdAt: w.createdAt?.toISOString() ?? "",
        updatedAt: w.updatedAt?.toISOString() ?? "",
      }));
    }
  );

  // Create watchlist
  typedApp.post(
    "/",
    {
      schema: {
        body: CreateWatchlistSchema,
        response: {
          201: WatchlistSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;
      const { name } = request.body;

      const [newWatchlist] = await db
        .insert(watchlists)
        .values({
          userId,
          name,
        })
        .returning();

      return reply.status(201).send({
        id: newWatchlist!.id,
        name: newWatchlist!.name,
        marketCount: 0,
        createdAt: newWatchlist!.createdAt?.toISOString() ?? "",
        updatedAt: newWatchlist!.updatedAt?.toISOString() ?? "",
      });
    }
  );

  // Get watchlist with markets
  typedApp.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: WatchlistSchema.extend({
            markets: z.array(
              z.object({
                id: z.string(),
                question: z.string(),
                qualityGrade: z.string().nullable(),
                currentPrice: z.number().nullable(),
                addedAt: z.string(),
              })
            ),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const watchlist = await db.query.watchlists.findFirst({
        where: eq(watchlists.id, id),
      });

      if (!watchlist) {
        return reply.status(404).send({ error: `Watchlist ${id} not found` });
      }

      // Get markets in this watchlist with their latest prices
      const watchlistMarketsData = await db
        .select({
          marketId: markets.id,
          question: markets.question,
          qualityGrade: markets.qualityGrade,
          addedAt: watchlistMarkets.addedAt,
        })
        .from(watchlistMarkets)
        .innerJoin(markets, eq(watchlistMarkets.marketId, markets.id))
        .where(eq(watchlistMarkets.watchlistId, id))
        .orderBy(desc(watchlistMarkets.addedAt));

      // Get latest prices for these markets
      const marketIds = watchlistMarketsData.map((m) => m.marketId);
      const snapshots = marketIds.length > 0
        ? await db
            .select({
              marketId: marketSnapshots.marketId,
              price: marketSnapshots.price,
            })
            .from(marketSnapshots)
            .where(sql`${marketSnapshots.marketId} IN ${marketIds} AND ${marketSnapshots.snapshotAt} = (
              SELECT MAX(snapshot_at) FROM market_snapshots ms2 WHERE ms2.market_id = ${marketSnapshots.marketId}
            )`)
        : [];

      const priceMap = new Map(snapshots.map((s) => [s.marketId, s.price]));

      const marketsWithPrices = watchlistMarketsData.map((m) => ({
        id: m.marketId,
        question: m.question,
        qualityGrade: m.qualityGrade,
        currentPrice: priceMap.get(m.marketId) ? Number(priceMap.get(m.marketId)) : null,
        addedAt: m.addedAt?.toISOString() ?? "",
      }));

      return {
        id: watchlist.id,
        name: watchlist.name,
        marketCount: marketsWithPrices.length,
        createdAt: watchlist.createdAt?.toISOString() ?? "",
        updatedAt: watchlist.updatedAt?.toISOString() ?? "",
        markets: marketsWithPrices,
      };
    }
  );

  // Add market to watchlist
  typedApp.post(
    "/:id/markets",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ marketId: z.string().uuid() }),
        response: {
          201: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { marketId } = request.body;

      // Check watchlist exists
      const watchlist = await db.query.watchlists.findFirst({
        where: eq(watchlists.id, id),
      });

      if (!watchlist) {
        return reply.status(404).send({ error: `Watchlist ${id} not found` });
      }

      // Check market exists
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${marketId} not found` });
      }

      // Check if already in watchlist
      const existing = await db.query.watchlistMarkets.findFirst({
        where: and(
          eq(watchlistMarkets.watchlistId, id),
          eq(watchlistMarkets.marketId, marketId)
        ),
      });

      if (existing) {
        return reply.status(409).send({ error: "Market already in watchlist" });
      }

      await db.insert(watchlistMarkets).values({
        watchlistId: id,
        marketId,
      });

      // Update watchlist timestamp
      await db
        .update(watchlists)
        .set({ updatedAt: new Date() })
        .where(eq(watchlists.id, id));

      return reply.status(201).send({ success: true });
    }
  );

  // Remove market from watchlist
  typedApp.delete(
    "/:id/markets/:marketId",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
          marketId: z.string().uuid(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id, marketId } = request.params;

      // Check watchlist exists
      const watchlist = await db.query.watchlists.findFirst({
        where: eq(watchlists.id, id),
      });

      if (!watchlist) {
        return reply.status(404).send({ error: `Watchlist ${id} not found` });
      }

      // Check if market is in watchlist
      const existing = await db.query.watchlistMarkets.findFirst({
        where: and(
          eq(watchlistMarkets.watchlistId, id),
          eq(watchlistMarkets.marketId, marketId)
        ),
      });

      if (!existing) {
        return reply.status(404).send({ error: "Market not in watchlist" });
      }

      await db
        .delete(watchlistMarkets)
        .where(
          and(
            eq(watchlistMarkets.watchlistId, id),
            eq(watchlistMarkets.marketId, marketId)
          )
        );

      // Update watchlist timestamp
      await db
        .update(watchlists)
        .set({ updatedAt: new Date() })
        .where(eq(watchlists.id, id));

      return { success: true };
    }
  );

  // Delete watchlist
  typedApp.delete(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const watchlist = await db.query.watchlists.findFirst({
        where: eq(watchlists.id, id),
      });

      if (!watchlist) {
        return reply.status(404).send({ error: `Watchlist ${id} not found` });
      }

      // Cascade delete handled by DB, but we can also do it explicitly
      await db.delete(watchlists).where(eq(watchlists.id, id));

      return { success: true };
    }
  );
};
