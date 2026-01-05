import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, trackedWallets, portfolioPositions, markets, marketSnapshots } from "@polybuddy/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const WalletSchema = z.object({
  id: z.string().uuid(),
  address: z.string(),
  label: z.string().nullable(),
  createdAt: z.string(),
});

const PositionSchema = z.object({
  id: z.string().uuid(),
  marketId: z.string().uuid(),
  marketQuestion: z.string(),
  outcome: z.string(),
  shares: z.number(),
  avgEntryPrice: z.number().nullable(),
  currentPrice: z.number().nullable(),
  currentValue: z.number().nullable(),
  unrealizedPnl: z.number().nullable(),
  pnlPercent: z.number().nullable(),
});

const PerformanceSchema = z.object({
  totalValue: z.number(),
  totalPnl: z.number(),
  realizedPnl: z.number(),
  unrealizedPnl: z.number(),
  totalTrades: z.number(),
  winRate: z.number(),
  avgSlippage: z.number(),
  entryTimingScore: z.number(),
});

export const portfolioRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List tracked wallets
  typedApp.get(
    "/wallets",
    {
      schema: {
        response: {
          200: z.array(WalletSchema),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;

      const wallets = await db
        .select()
        .from(trackedWallets)
        .where(eq(trackedWallets.userId, userId))
        .orderBy(desc(trackedWallets.createdAt));

      return wallets.map((w) => ({
        id: w.id,
        address: w.address,
        label: w.label,
        createdAt: w.createdAt?.toISOString() ?? "",
      }));
    }
  );

  // Add tracked wallet (read-only - just paste address)
  typedApp.post(
    "/wallets",
    {
      schema: {
        body: z.object({
          address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
          label: z.string().max(100).optional(),
        }),
        response: {
          201: WalletSchema,
          401: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;
      const { address, label } = request.body;

      // Check if wallet already tracked by this user
      const existing = await db.query.trackedWallets.findFirst({
        where: and(
          eq(trackedWallets.userId, userId),
          eq(trackedWallets.address, address.toLowerCase())
        ),
      });

      if (existing) {
        return reply.status(409).send({ error: "Wallet already tracked" });
      }

      const [newWallet] = await db
        .insert(trackedWallets)
        .values({
          userId,
          address: address.toLowerCase(),
          label: label ?? null,
        })
        .returning();

      return reply.status(201).send({
        id: newWallet!.id,
        address: newWallet!.address,
        label: newWallet!.label,
        createdAt: newWallet!.createdAt?.toISOString() ?? "",
      });
    }
  );

  // Update wallet label
  typedApp.patch(
    "/wallets/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          label: z.string().max(100).nullable(),
        }),
        response: {
          200: WalletSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { label } = request.body;

      const wallet = await db.query.trackedWallets.findFirst({
        where: eq(trackedWallets.id, id),
      });

      if (!wallet) {
        return reply.status(404).send({ error: `Wallet ${id} not found` });
      }

      const [updated] = await db
        .update(trackedWallets)
        .set({ label })
        .where(eq(trackedWallets.id, id))
        .returning();

      return {
        id: updated!.id,
        address: updated!.address,
        label: updated!.label,
        createdAt: updated!.createdAt?.toISOString() ?? "",
      };
    }
  );

  // Remove tracked wallet
  typedApp.delete(
    "/wallets/:id",
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

      const wallet = await db.query.trackedWallets.findFirst({
        where: eq(trackedWallets.id, id),
      });

      if (!wallet) {
        return reply.status(404).send({ error: `Wallet ${id} not found` });
      }

      // Cascade delete will remove positions
      await db.delete(trackedWallets).where(eq(trackedWallets.id, id));

      return { success: true };
    }
  );

  // Get positions for a wallet
  typedApp.get(
    "/wallets/:id/positions",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({
            wallet: WalletSchema,
            positions: z.array(PositionSchema),
            summary: z.object({
              totalValue: z.number(),
              totalUnrealizedPnl: z.number(),
              positionCount: z.number(),
            }),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const wallet = await db.query.trackedWallets.findFirst({
        where: eq(trackedWallets.id, id),
      });

      if (!wallet) {
        return reply.status(404).send({ error: `Wallet ${id} not found` });
      }

      // Get positions with market data
      const positionsData = await db
        .select({
          id: portfolioPositions.id,
          marketId: portfolioPositions.marketId,
          outcome: portfolioPositions.outcome,
          shares: portfolioPositions.shares,
          avgEntryPrice: portfolioPositions.avgEntryPrice,
          currentValue: portfolioPositions.currentValue,
          unrealizedPnl: portfolioPositions.unrealizedPnl,
          marketQuestion: markets.question,
        })
        .from(portfolioPositions)
        .innerJoin(markets, eq(portfolioPositions.marketId, markets.id))
        .where(eq(portfolioPositions.walletId, id))
        .orderBy(desc(portfolioPositions.updatedAt));

      // Get latest prices for these markets
      const marketIds = positionsData.map((p) => p.marketId);
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

      const priceMap = new Map(snapshots.map((s) => [s.marketId, Number(s.price)]));

      const positions = positionsData.map((p) => {
        const shares = Number(p.shares);
        const avgEntryPrice = p.avgEntryPrice ? Number(p.avgEntryPrice) : null;
        const currentPrice = priceMap.get(p.marketId) ?? null;
        const currentValue = currentPrice !== null ? shares * currentPrice : null;
        const unrealizedPnl = currentValue !== null && avgEntryPrice !== null
          ? currentValue - (shares * avgEntryPrice)
          : null;
        const pnlPercent = avgEntryPrice !== null && avgEntryPrice > 0 && currentPrice !== null
          ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100
          : null;

        return {
          id: p.id,
          marketId: p.marketId,
          marketQuestion: p.marketQuestion,
          outcome: p.outcome,
          shares,
          avgEntryPrice,
          currentPrice,
          currentValue,
          unrealizedPnl,
          pnlPercent,
        };
      });

      const totalValue = positions.reduce((sum, p) => sum + (p.currentValue ?? 0), 0);
      const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);

      return {
        wallet: {
          id: wallet.id,
          address: wallet.address,
          label: wallet.label,
          createdAt: wallet.createdAt?.toISOString() ?? "",
        },
        positions,
        summary: {
          totalValue,
          totalUnrealizedPnl,
          positionCount: positions.length,
        },
      };
    }
  );

  // Add/update a position (for testing or manual entry)
  typedApp.post(
    "/wallets/:id/positions",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          marketId: z.string().uuid(),
          outcome: z.string().min(1).max(50),
          shares: z.number().positive(),
          avgEntryPrice: z.number().min(0).max(1).optional(),
        }),
        response: {
          201: PositionSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { marketId, outcome, shares, avgEntryPrice } = request.body;

      // Check wallet exists
      const wallet = await db.query.trackedWallets.findFirst({
        where: eq(trackedWallets.id, id),
      });

      if (!wallet) {
        return reply.status(404).send({ error: `Wallet ${id} not found` });
      }

      // Check market exists
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${marketId} not found` });
      }

      // Get current price
      const [snapshot] = await db
        .select({ price: marketSnapshots.price })
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, marketId))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      const currentPrice = snapshot?.price ? Number(snapshot.price) : null;
      const currentValue = currentPrice !== null ? shares * currentPrice : null;
      const entryPrice = avgEntryPrice ?? currentPrice ?? null;
      const unrealizedPnl = currentValue !== null && entryPrice !== null
        ? currentValue - (shares * entryPrice)
        : null;

      // Check if position already exists
      const existing = await db.query.portfolioPositions.findFirst({
        where: and(
          eq(portfolioPositions.walletId, id),
          eq(portfolioPositions.marketId, marketId),
          eq(portfolioPositions.outcome, outcome)
        ),
      });

      let position;
      if (existing) {
        // Update existing position
        [position] = await db
          .update(portfolioPositions)
          .set({
            shares: shares.toString(),
            avgEntryPrice: entryPrice?.toString() ?? null,
            currentValue: currentValue?.toString() ?? null,
            unrealizedPnl: unrealizedPnl?.toString() ?? null,
            updatedAt: new Date(),
          })
          .where(eq(portfolioPositions.id, existing.id))
          .returning();
      } else {
        // Create new position
        [position] = await db
          .insert(portfolioPositions)
          .values({
            walletId: id,
            marketId,
            outcome,
            shares: shares.toString(),
            avgEntryPrice: entryPrice?.toString() ?? null,
            currentValue: currentValue?.toString() ?? null,
            unrealizedPnl: unrealizedPnl?.toString() ?? null,
          })
          .returning();
      }

      const pnlPercent = entryPrice !== null && entryPrice > 0 && currentPrice !== null
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : null;

      return reply.status(201).send({
        id: position!.id,
        marketId: position!.marketId,
        marketQuestion: market.question,
        outcome: position!.outcome,
        shares,
        avgEntryPrice: entryPrice,
        currentPrice,
        currentValue,
        unrealizedPnl,
        pnlPercent,
      });
    }
  );

  // Delete a position
  typedApp.delete(
    "/wallets/:walletId/positions/:positionId",
    {
      schema: {
        params: z.object({
          walletId: z.string().uuid(),
          positionId: z.string().uuid(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { walletId, positionId } = request.params;

      const position = await db.query.portfolioPositions.findFirst({
        where: and(
          eq(portfolioPositions.id, positionId),
          eq(portfolioPositions.walletId, walletId)
        ),
      });

      if (!position) {
        return reply.status(404).send({ error: `Position ${positionId} not found` });
      }

      await db.delete(portfolioPositions).where(eq(portfolioPositions.id, positionId));

      return { success: true };
    }
  );

  // Get aggregated performance metrics
  typedApp.get(
    "/performance",
    {
      schema: {
        querystring: z.object({
          walletId: z.string().uuid().optional(),
          period: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
        }),
        response: {
          200: PerformanceSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;
      const { walletId } = request.query;

      // Get user's wallets
      const walletsCondition = walletId
        ? eq(trackedWallets.id, walletId)
        : eq(trackedWallets.userId, userId);

      const userWallets = await db
        .select({ id: trackedWallets.id })
        .from(trackedWallets)
        .where(walletsCondition);

      const walletIds = userWallets.map((w) => w.id);

      if (walletIds.length === 0) {
        return {
          totalValue: 0,
          totalPnl: 0,
          realizedPnl: 0,
          unrealizedPnl: 0,
          totalTrades: 0,
          winRate: 0,
          avgSlippage: 0,
          entryTimingScore: 50,
        };
      }

      // Get all positions for these wallets
      const positions = await db
        .select({
          currentValue: portfolioPositions.currentValue,
          unrealizedPnl: portfolioPositions.unrealizedPnl,
          avgEntryPrice: portfolioPositions.avgEntryPrice,
          shares: portfolioPositions.shares,
        })
        .from(portfolioPositions)
        .where(sql`${portfolioPositions.walletId} IN ${walletIds}`);

      let totalValue = 0;
      let unrealizedPnl = 0;
      let winningPositions = 0;

      for (const pos of positions) {
        if (pos.currentValue) totalValue += Number(pos.currentValue);
        if (pos.unrealizedPnl) {
          const pnl = Number(pos.unrealizedPnl);
          unrealizedPnl += pnl;
          if (pnl > 0) winningPositions++;
        }
      }

      const winRate = positions.length > 0
        ? (winningPositions / positions.length) * 100
        : 0;

      // Entry timing score: compare avg entry price to current price distribution
      // Higher score = better entry timing (bought low)
      const entryTimingScore = 50 + (winRate / 2 - 25); // Simple approximation

      return {
        totalValue,
        totalPnl: unrealizedPnl, // For now, total = unrealized (no realized tracking yet)
        realizedPnl: 0, // Would need trade history
        unrealizedPnl,
        totalTrades: positions.length,
        winRate,
        avgSlippage: 0, // Would need trade execution data
        entryTimingScore: Math.max(0, Math.min(100, entryTimingScore)),
      };
    }
  );

  // Get portfolio summary across all wallets
  typedApp.get(
    "/summary",
    {
      schema: {
        response: {
          200: z.object({
            walletCount: z.number(),
            totalPositions: z.number(),
            totalValue: z.number(),
            totalUnrealizedPnl: z.number(),
            topPositions: z.array(PositionSchema),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;

      // Get user's wallets
      const userWallets = await db
        .select({ id: trackedWallets.id })
        .from(trackedWallets)
        .where(eq(trackedWallets.userId, userId));

      const walletIds = userWallets.map((w) => w.id);

      if (walletIds.length === 0) {
        return {
          walletCount: 0,
          totalPositions: 0,
          totalValue: 0,
          totalUnrealizedPnl: 0,
          topPositions: [],
        };
      }

      // Get all positions with market data
      const positionsData = await db
        .select({
          id: portfolioPositions.id,
          marketId: portfolioPositions.marketId,
          outcome: portfolioPositions.outcome,
          shares: portfolioPositions.shares,
          avgEntryPrice: portfolioPositions.avgEntryPrice,
          currentValue: portfolioPositions.currentValue,
          unrealizedPnl: portfolioPositions.unrealizedPnl,
          marketQuestion: markets.question,
        })
        .from(portfolioPositions)
        .innerJoin(markets, eq(portfolioPositions.marketId, markets.id))
        .where(sql`${portfolioPositions.walletId} IN ${walletIds}`)
        .orderBy(desc(portfolioPositions.currentValue))
        .limit(100);

      // Get latest prices
      const marketIds = [...new Set(positionsData.map((p) => p.marketId))];
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

      const priceMap = new Map(snapshots.map((s) => [s.marketId, Number(s.price)]));

      const positions = positionsData.map((p) => {
        const shares = Number(p.shares);
        const avgEntryPrice = p.avgEntryPrice ? Number(p.avgEntryPrice) : null;
        const currentPrice = priceMap.get(p.marketId) ?? null;
        const currentValue = currentPrice !== null ? shares * currentPrice : (p.currentValue ? Number(p.currentValue) : null);
        const unrealizedPnl = p.unrealizedPnl ? Number(p.unrealizedPnl) : null;
        const pnlPercent = avgEntryPrice !== null && avgEntryPrice > 0 && currentPrice !== null
          ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100
          : null;

        return {
          id: p.id,
          marketId: p.marketId,
          marketQuestion: p.marketQuestion,
          outcome: p.outcome,
          shares,
          avgEntryPrice,
          currentPrice,
          currentValue,
          unrealizedPnl,
          pnlPercent,
        };
      });

      const totalValue = positions.reduce((sum, p) => sum + (p.currentValue ?? 0), 0);
      const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);

      // Sort by value and take top 5
      const topPositions = positions
        .sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0))
        .slice(0, 5);

      return {
        walletCount: walletIds.length,
        totalPositions: positions.length,
        totalValue,
        totalUnrealizedPnl,
        topPositions,
      };
    }
  );
};
