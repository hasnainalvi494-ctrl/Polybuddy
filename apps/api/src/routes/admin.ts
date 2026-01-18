/**
 * Admin API Routes
 * 
 * For managing data sync and system administration
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "@polybuddy/db";
import { walletPerformance } from "@polybuddy/db";
import { sql } from "drizzle-orm";

export async function adminRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // =============================================
  // POST /api/admin/refresh-demo-data
  // Refresh demo trader data
  // =============================================
  typedApp.post(
    "/api/admin/refresh-demo-data",
    {
      schema: {
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            tradersCount: z.number(),
          }),
          400: z.object({
            error: z.string(),
          }),
          500: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        // Check if demo data exists
        const existing = await db.execute(sql`
          SELECT COUNT(*) as count FROM wallet_performance
        `);
        
        const count = parseInt(existing[0]?.count as string || '0');
        
        if (count === 0) {
          return reply.status(400).send({
            error: "No demo data found. Please run setup-elite-traders.sql first",
          });
        }
        
        // Recalculate ranks
        await db.execute(sql`
          WITH ranked_traders AS (
            SELECT 
              wallet_address,
              ROW_NUMBER() OVER (ORDER BY elite_score DESC NULLS LAST) as new_rank,
              ROW_NUMBER() OVER (ORDER BY elite_score DESC) FILTER (WHERE trader_tier = 'elite') as new_elite_rank
            FROM wallet_performance
          )
          UPDATE wallet_performance wp
          SET 
            rank = rt.new_rank,
            elite_rank = rt.new_elite_rank,
            updated_at = NOW()
          FROM ranked_traders rt
          WHERE wp.wallet_address = rt.wallet_address
        `);
        
        return {
          success: true,
          message: "Demo data refreshed successfully",
          tradersCount: count,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to refresh demo data",
        });
      }
    }
  );

  // =============================================
  // GET /api/admin/stats
  // Get system statistics
  // =============================================
  typedApp.get(
    "/api/admin/stats",
    {
      schema: {
        response: {
          200: z.object({
            totalTraders: z.number(),
            eliteTraders: z.number(),
            strongTraders: z.number(),
            moderateTraders: z.number(),
            avgEliteScore: z.number(),
            totalVolume: z.string(),
            totalProfit: z.string(),
          }),
          500: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const stats = await db.execute(sql`
          SELECT
            COUNT(*) as total_traders,
            COUNT(*) FILTER (WHERE trader_tier = 'elite') as elite_traders,
            COUNT(*) FILTER (WHERE trader_tier = 'strong') as strong_traders,
            COUNT(*) FILTER (WHERE trader_tier = 'moderate') as moderate_traders,
            AVG(COALESCE(elite_score, 0)) as avg_elite_score,
            SUM(COALESCE(CAST(total_volume AS DECIMAL), 0)) as total_volume,
            SUM(COALESCE(CAST(total_profit AS DECIMAL), 0)) as total_profit
          FROM wallet_performance
        `);
        
        const row = stats[0] || {};
        
        return {
          totalTraders: parseInt(row.total_traders as string || '0'),
          eliteTraders: parseInt(row.elite_traders as string || '0'),
          strongTraders: parseInt(row.strong_traders as string || '0'),
          moderateTraders: parseInt(row.moderate_traders as string || '0'),
          avgEliteScore: parseFloat(row.avg_elite_score as string || '0'),
          totalVolume: (row.total_volume || '0').toString(),
          totalProfit: (row.total_profit || '0').toString(),
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch system stats",
        });
      }
    }
  );
}
