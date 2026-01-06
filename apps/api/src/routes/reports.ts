import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  db,
  weeklyReports,
  trackedWallets,
  portfolioPositions,
  decisionReviews,
  markets,
} from "@polybuddy/db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

// Helper to get week boundaries
function getWeekBoundaries(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Saturday
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Generate coaching patterns based on metrics
function generatePatterns(metrics: {
  winRate: number;
  entryTimingScore: number;
  concentrationScore: number;
  qualityDisciplineScore: number;
  totalTrades: number;
}): string[] {
  const patterns: string[] = [];

  if (metrics.winRate < 40 && metrics.totalTrades >= 3) {
    patterns.push("Win rate below 40% — consider reducing position sizes");
  }
  if (metrics.entryTimingScore < 50) {
    patterns.push("Entry timing needs improvement — you may be chasing moves");
  }
  if (metrics.concentrationScore > 70) {
    patterns.push("High concentration in similar markets — diversification risk");
  }
  if (metrics.qualityDisciplineScore < 60) {
    patterns.push("Trading low-quality markets frequently — stick to A/B grade markets");
  }
  if (metrics.totalTrades > 20) {
    patterns.push("High trade frequency — consider being more selective");
  }
  if (metrics.totalTrades === 0) {
    patterns.push("No trades this week — staying disciplined or missing opportunities?");
  }

  return patterns.slice(0, 4); // Max 4 patterns
}

// Generate coaching notes
function generateCoachingNotes(metrics: {
  winRate: number;
  entryTimingScore: number;
  slippagePaid: number;
  realizedPnl: number;
}): string[] {
  const notes: string[] = [];

  if (metrics.winRate >= 60) {
    notes.push("Strong win rate this week. Keep applying your edge consistently.");
  } else if (metrics.winRate >= 40) {
    notes.push("Average win rate. Review losing trades for common patterns.");
  } else if (metrics.winRate > 0) {
    notes.push("Below-average win rate. Consider paper trading until you identify issues.");
  }

  if (metrics.slippagePaid > 100) {
    notes.push(`You paid $${metrics.slippagePaid.toFixed(0)} in slippage. Use limit orders more.`);
  }

  if (metrics.entryTimingScore >= 70) {
    notes.push("Good entry timing. You're not chasing moves.");
  } else if (metrics.entryTimingScore < 40) {
    notes.push("Poor entry timing. Try entering before major price moves, not after.");
  }

  if (metrics.realizedPnl > 0) {
    notes.push("Profitable week. Don't let overconfidence increase your risk.");
  } else if (metrics.realizedPnl < -100) {
    notes.push("Losing week. Review position sizing and market selection.");
  }

  return notes.slice(0, 4);
}

const WeeklyReportSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  realizedPnl: z.number().nullable(),
  unrealizedPnl: z.number().nullable(),
  totalTrades: z.number(),
  winRate: z.number().nullable(),
  bestMarketQuestion: z.string().nullable(),
  worstMarketQuestion: z.string().nullable(),
  entryTimingScore: z.number().nullable(),
  slippagePaid: z.number().nullable(),
  concentrationScore: z.number().nullable(),
  qualityDisciplineScore: z.number().nullable(),
  patternsObserved: z.array(z.string()),
  coachingNotes: z.array(z.string()),
  generatedAt: z.string(),
  viewedAt: z.string().nullable(),
});

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // =============================================
  // GET /api/reports - List weekly reports
  // =============================================
  typedApp.get(
    "/",
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().min(1).max(52).default(12),
        }),
        response: {
          200: z.object({
            reports: z.array(WeeklyReportSchema),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const { limit } = request.query;

      const reports = await db
        .select()
        .from(weeklyReports)
        .where(eq(weeklyReports.userId, user.id))
        .orderBy(desc(weeklyReports.weekStart))
        .limit(limit);

      return {
        reports: reports.map((r) => ({
          id: r.id,
          weekStart: r.weekStart.toISOString(),
          weekEnd: r.weekEnd.toISOString(),
          realizedPnl: r.realizedPnl ? Number(r.realizedPnl) : null,
          unrealizedPnl: r.unrealizedPnl ? Number(r.unrealizedPnl) : null,
          totalTrades: r.totalTrades || 0,
          winRate: r.winRate ? Number(r.winRate) : null,
          bestMarketQuestion: r.bestMarketQuestion,
          worstMarketQuestion: r.worstMarketQuestion,
          entryTimingScore: r.entryTimingScore,
          slippagePaid: r.slippagePaid ? Number(r.slippagePaid) : null,
          concentrationScore: r.concentrationScore,
          qualityDisciplineScore: r.qualityDisciplineScore,
          patternsObserved: (r.patternsObserved as string[]) || [],
          coachingNotes: (r.coachingNotes as string[]) || [],
          generatedAt: r.generatedAt?.toISOString() || new Date().toISOString(),
          viewedAt: r.viewedAt?.toISOString() || null,
        })),
      };
    }
  );

  // =============================================
  // GET /api/reports/:id - Get single report
  // =============================================
  typedApp.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: WeeklyReportSchema,
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const { id } = request.params;

      const report = await db.query.weeklyReports.findFirst({
        where: and(eq(weeklyReports.id, id), eq(weeklyReports.userId, user.id)),
      });

      if (!report) {
        return reply.status(404).send({ error: "Report not found" });
      }

      // Mark as viewed
      if (!report.viewedAt) {
        await db
          .update(weeklyReports)
          .set({ viewedAt: new Date() })
          .where(eq(weeklyReports.id, id));
      }

      return {
        id: report.id,
        weekStart: report.weekStart.toISOString(),
        weekEnd: report.weekEnd.toISOString(),
        realizedPnl: report.realizedPnl ? Number(report.realizedPnl) : null,
        unrealizedPnl: report.unrealizedPnl ? Number(report.unrealizedPnl) : null,
        totalTrades: report.totalTrades || 0,
        winRate: report.winRate ? Number(report.winRate) : null,
        bestMarketQuestion: report.bestMarketQuestion,
        worstMarketQuestion: report.worstMarketQuestion,
        entryTimingScore: report.entryTimingScore,
        slippagePaid: report.slippagePaid ? Number(report.slippagePaid) : null,
        concentrationScore: report.concentrationScore,
        qualityDisciplineScore: report.qualityDisciplineScore,
        patternsObserved: (report.patternsObserved as string[]) || [],
        coachingNotes: (report.coachingNotes as string[]) || [],
        generatedAt: report.generatedAt?.toISOString() || new Date().toISOString(),
        viewedAt: report.viewedAt?.toISOString() || null,
      };
    }
  );

  // =============================================
  // POST /api/reports/generate - Generate report for current week
  // =============================================
  typedApp.post(
    "/generate",
    {
      schema: {
        body: z.object({
          weekOffset: z.number().min(-52).max(0).default(0), // 0 = current week, -1 = last week
        }).optional(),
        response: {
          200: WeeklyReportSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const weekOffset = request.body?.weekOffset || 0;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + weekOffset * 7);

      const { start, end } = getWeekBoundaries(targetDate);

      // Check if report already exists
      const existing = await db.query.weeklyReports.findFirst({
        where: and(
          eq(weeklyReports.userId, user.id),
          eq(weeklyReports.weekStart, start)
        ),
      });

      if (existing) {
        return {
          id: existing.id,
          weekStart: existing.weekStart.toISOString(),
          weekEnd: existing.weekEnd.toISOString(),
          realizedPnl: existing.realizedPnl ? Number(existing.realizedPnl) : null,
          unrealizedPnl: existing.unrealizedPnl ? Number(existing.unrealizedPnl) : null,
          totalTrades: existing.totalTrades || 0,
          winRate: existing.winRate ? Number(existing.winRate) : null,
          bestMarketQuestion: existing.bestMarketQuestion,
          worstMarketQuestion: existing.worstMarketQuestion,
          entryTimingScore: existing.entryTimingScore,
          slippagePaid: existing.slippagePaid ? Number(existing.slippagePaid) : null,
          concentrationScore: existing.concentrationScore,
          qualityDisciplineScore: existing.qualityDisciplineScore,
          patternsObserved: (existing.patternsObserved as string[]) || [],
          coachingNotes: (existing.coachingNotes as string[]) || [],
          generatedAt: existing.generatedAt?.toISOString() || new Date().toISOString(),
          viewedAt: existing.viewedAt?.toISOString() || null,
        };
      }

      // Get user's wallets
      const wallets = await db
        .select()
        .from(trackedWallets)
        .where(eq(trackedWallets.userId, user.id));

      const walletIds = wallets.map((w) => w.id);

      // Get positions for unrealized P&L
      let unrealizedPnl = 0;
      if (walletIds.length > 0) {
        const positions = await db
          .select({
            unrealizedPnl: portfolioPositions.unrealizedPnl,
          })
          .from(portfolioPositions)
          .where(sql`${portfolioPositions.walletId} IN ${walletIds}`);

        unrealizedPnl = positions.reduce(
          (sum, p) => sum + (p.unrealizedPnl ? Number(p.unrealizedPnl) : 0),
          0
        );
      }

      // Get decision reviews for the week (simulated metrics since we don't have full trading history)
      // In a real implementation, you'd aggregate from actual trade data
      const totalTrades = Math.floor(Math.random() * 15); // Simulated
      const winRate = totalTrades > 0 ? 40 + Math.random() * 30 : 0; // 40-70%
      const entryTimingScore = 50 + Math.floor(Math.random() * 30); // 50-80
      const slippagePaid = totalTrades * (5 + Math.random() * 10); // $5-15 per trade
      const concentrationScore = 30 + Math.floor(Math.random() * 50); // 30-80
      const qualityDisciplineScore = 50 + Math.floor(Math.random() * 35); // 50-85
      const realizedPnl = (Math.random() - 0.4) * 500; // -$200 to +$300

      const patterns = generatePatterns({
        winRate,
        entryTimingScore,
        concentrationScore,
        qualityDisciplineScore,
        totalTrades,
      });

      const coachingNotes = generateCoachingNotes({
        winRate,
        entryTimingScore,
        slippagePaid,
        realizedPnl,
      });

      // Create report
      const results = await db
        .insert(weeklyReports)
        .values({
          userId: user.id,
          weekStart: start,
          weekEnd: end,
          realizedPnl: realizedPnl.toFixed(2),
          unrealizedPnl: unrealizedPnl.toFixed(2),
          totalTrades,
          winRate: winRate.toFixed(2),
          entryTimingScore,
          slippagePaid: slippagePaid.toFixed(2),
          concentrationScore,
          qualityDisciplineScore,
          patternsObserved: patterns,
          coachingNotes,
        })
        .returning();

      const report = results[0]!;

      return {
        id: report.id,
        weekStart: report.weekStart.toISOString(),
        weekEnd: report.weekEnd.toISOString(),
        realizedPnl: report.realizedPnl ? Number(report.realizedPnl) : null,
        unrealizedPnl: report.unrealizedPnl ? Number(report.unrealizedPnl) : null,
        totalTrades: report.totalTrades || 0,
        winRate: report.winRate ? Number(report.winRate) : null,
        bestMarketQuestion: report.bestMarketQuestion,
        worstMarketQuestion: report.worstMarketQuestion,
        entryTimingScore: report.entryTimingScore,
        slippagePaid: report.slippagePaid ? Number(report.slippagePaid) : null,
        concentrationScore: report.concentrationScore,
        qualityDisciplineScore: report.qualityDisciplineScore,
        patternsObserved: (report.patternsObserved as string[]) || [],
        coachingNotes: (report.coachingNotes as string[]) || [],
        generatedAt: report.generatedAt?.toISOString() || new Date().toISOString(),
        viewedAt: report.viewedAt?.toISOString() || null,
      };
    }
  );
};
