/**
 * Elite Traders API Routes
 * 
 * Endpoints for elite trader identification, scoring, and Best Bets recommendations
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

// Request/Response Schemas
const eliteTraderSchema = z.object({
  walletAddress: z.string(),
  eliteScore: z.number(),
  traderTier: z.enum(["elite", "strong", "moderate", "developing", "limited"]),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]),
  
  // User profile (from Polymarket)
  userName: z.string().nullable(),
  xUsername: z.string().nullable(),
  profileImage: z.string().nullable(),
  verifiedBadge: z.boolean(),
  
  // Performance metrics
  winRate: z.number(),
  profitFactor: z.number(),
  sharpeRatio: z.number(),
  maxDrawdown: z.number(),
  totalProfit: z.number(),
  totalVolume: z.number(),
  tradeCount: z.number(),
  
  // Rankings
  rank: z.number(),
  eliteRank: z.number().nullable(),
  
  // Specialization
  primaryCategory: z.string().nullable(),
  categorySpecialization: z.record(z.number()).nullable(),
  
  // Insights
  strengths: z.array(z.string()),
  warnings: z.array(z.string()),
  isRecommended: z.boolean(),
});

const bestBetSchema = z.object({
  marketId: z.string(),
  marketQuestion: z.string(),
  marketCategory: z.string().nullable(),
  
  // Elite activity
  eliteTraderCount: z.number(),
  avgEliteScore: z.number(),
  totalEliteVolume: z.number(),
  eliteConsensus: z.enum(["bullish", "bearish", "mixed"]),
  consensusStrength: z.number(),
  
  // Recommendation
  recommendationStrength: z.enum(["strong", "moderate", "weak"]),
  recommendedSide: z.enum(["yes", "no", "none"]),
  confidenceScore: z.number(),
  
  // Market metrics
  currentPrice: z.number(),
  avgEliteEntryPrice: z.number(),
  potentialReturn: z.number(),
  riskLevel: z.enum(["low", "medium", "high"]),
  
  // Top traders
  topTraders: z.array(z.object({
    address: z.string(),
    eliteScore: z.number(),
    position: z.enum(["yes", "no"]),
    confidence: z.number(),
  })),
  
  // Timing
  lastEliteActivity: z.string(),
  activityTrend: z.enum(["increasing", "stable", "decreasing"]),
});

export async function eliteTraderRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // =============================================
  // GET /api/elite-traders
  // Get all elite traders with filtering
  // =============================================
  typedApp.get(
    "/api/elite-traders",
    {
      schema: {
        querystring: z.object({
          tier: z.enum(["elite", "strong", "moderate", "developing", "limited"]).optional(),
          minScore: z.coerce.number().min(0).max(100).optional(),
          category: z.string().optional(),
          limit: z.coerce.number().min(1).max(100).default(20),
          offset: z.coerce.number().min(0).default(0),
        }),
        response: {
          200: z.object({
            traders: z.array(eliteTraderSchema),
            total: z.number(),
            eliteCount: z.number(),
            strongCount: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { tier, minScore, category, limit, offset } = request.query;
      
      try {
        // Query wallet performance with filters - using raw SQL
        const results = await db.execute(sql`
          SELECT 
            wallet_address,
            elite_score,
            trader_tier,
            risk_profile,
            win_rate,
            profit_factor,
            sharpe_ratio,
            max_drawdown,
            total_profit,
            total_volume,
            trade_count,
            rank,
            elite_rank,
            primary_category,
            secondary_category,
            category_specialization,
            longest_win_streak,
            consecutive_wins,
            user_name,
            x_username,
            profile_image,
            verified_badge
          FROM wallet_performance
          WHERE elite_score IS NOT NULL
          ${tier ? sql`AND trader_tier = ${tier}` : sql``}
          ${minScore !== undefined ? sql`AND elite_score >= ${minScore}` : sql``}
          ${category ? sql`AND primary_category = ${category}` : sql``}
          ORDER BY elite_score DESC 
          LIMIT ${limit} OFFSET ${offset}
        `);
        
        // Get counts
        const countsResult = await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE trader_tier = 'elite') as elite_count,
            COUNT(*) FILTER (WHERE trader_tier = 'strong') as strong_count,
            COUNT(*) as total
          FROM wallet_performance
          WHERE elite_score IS NOT NULL
        `);
        
        // results is an array directly, not results.rows
        const traders = results.map((row: any) => ({
          walletAddress: row.wallet_address,
          eliteScore: parseFloat(row.elite_score || 0),
          traderTier: row.trader_tier || 'limited',
          riskProfile: row.risk_profile || 'moderate',
          // User profile fields
          userName: row.user_name || null,
          xUsername: row.x_username || null,
          profileImage: row.profile_image || null,
          verifiedBadge: row.verified_badge || false,
          // Performance metrics
          winRate: parseFloat(row.win_rate || 0),
          profitFactor: parseFloat(row.profit_factor || 0),
          sharpeRatio: parseFloat(row.sharpe_ratio || 0),
          maxDrawdown: parseFloat(row.max_drawdown || 0),
          totalProfit: parseFloat(row.total_profit || 0),
          totalVolume: parseFloat(row.total_volume || 0),
          tradeCount: parseInt(row.trade_count || 0),
          rank: parseInt(row.rank || 0),
          eliteRank: row.elite_rank ? parseInt(row.elite_rank) : null,
          primaryCategory: row.primary_category,
          categorySpecialization: row.category_specialization,
          strengths: generateStrengths(row),
          warnings: generateWarnings(row),
          isRecommended: row.trader_tier === 'elite' && parseFloat(row.elite_score) >= 80,
        }));
        
        return {
          traders,
          total: parseInt(countsResult[0]?.total || '0'),
          eliteCount: parseInt(countsResult[0]?.elite_count || '0'),
          strongCount: parseInt(countsResult[0]?.strong_count || '0'),
        };
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to fetch elite traders" });
      }
    }
  );

  // =============================================
  // GET /api/elite-traders/:address
  // Get detailed information for a specific trader
  // =============================================
  typedApp.get(
    "/api/elite-traders/:address",
    {
      schema: {
        params: z.object({
          address: z.string(),
        }),
        response: {
          200: eliteTraderSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { address } = request.params;
      
      try {
        const result = await db.execute(sql`
          SELECT * FROM wallet_performance
          WHERE wallet_address = ${address}
        `);
        
        if (result.length === 0) {
          return reply.status(404).send({ error: "Trader not found" });
        }
        
        const row = result[0];
        return {
          walletAddress: row.wallet_address,
          eliteScore: parseFloat(row.elite_score || 0),
          traderTier: row.trader_tier || 'limited',
          riskProfile: row.risk_profile || 'moderate',
          winRate: parseFloat(row.win_rate || 0),
          profitFactor: parseFloat(row.profit_factor || 0),
          sharpeRatio: parseFloat(row.sharpe_ratio || 0),
          maxDrawdown: parseFloat(row.max_drawdown || 0),
          totalProfit: parseFloat(row.total_profit || 0),
          totalVolume: parseFloat(row.total_volume || 0),
          tradeCount: parseInt(row.trade_count || 0),
          rank: parseInt(row.rank || 0),
          eliteRank: row.elite_rank ? parseInt(row.elite_rank) : null,
          primaryCategory: row.primary_category,
          categorySpecialization: row.category_specialization,
          strengths: generateStrengths(row),
          warnings: generateWarnings(row),
          isRecommended: row.trader_tier === 'elite' && parseFloat(row.elite_score) >= 80,
        };
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to fetch trader details" });
      }
    }
  );

  // =============================================
  // GET /api/best-bets
  // COMMENTED OUT - Duplicate route, using best-bets-api.ts instead
  // =============================================
  // typedApp.get(
  //   "/api/best-bets",
  //   {
  //     schema: {
  //       querystring: z.object({
  //         category: z.string().optional(),
  //         minConfidence: z.coerce.number().min(0).max(100).default(50),
  //         minEliteTraders: z.coerce.number().min(1).default(2),
  //         trending: z.coerce.boolean().default(false),
  //         limit: z.coerce.number().min(1).max(50).default(10),
  //       }),
  //       response: {
  //         200: z.object({
  //           bestBets: z.array(bestBetSchema),
  //           total: z.number(),
  //         }),
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     const { category, minConfidence, minEliteTraders, trending, limit } = request.query;
  //     
  //     try {
  //       // This would be replaced with actual logic using the best-bets-engine
  //       // For now, return mock data structure
  //       const mockBets: any[] = [];
  //       
  //       return {
  //         bestBets: mockBets,
  //         total: mockBets.length,
  //       };
  //     } catch (error) {
  //       request.log.error(error);
  //       reply.status(500).send({ error: "Failed to generate Best Bets" });
  //     }
  //   }
  // );

  // =============================================
  // GET /api/elite-traders/leaderboard
  // Get elite traders leaderboard
  // =============================================
  typedApp.get(
    "/api/elite-traders/leaderboard",
    {
      schema: {
        querystring: z.object({
          eliteOnly: z.coerce.boolean().default(true),
          limit: z.coerce.number().min(1).max(100).default(50),
        }),
        response: {
          200: z.object({
            leaderboard: z.array(eliteTraderSchema),
          }),
        },
      },
    },
    async (request, reply) => {
      const { eliteOnly, limit } = request.query;
      
      try {
        const result = await db.execute(sql`
          SELECT * FROM wallet_performance
          WHERE elite_score IS NOT NULL
          ${eliteOnly ? sql`AND trader_tier = 'elite'` : sql``}
          ORDER BY elite_rank ASC NULLS LAST, elite_score DESC 
          LIMIT ${limit}
        `);
        
        const leaderboard = result.map((row: any) => ({
          walletAddress: row.wallet_address,
          eliteScore: parseFloat(row.elite_score || 0),
          traderTier: row.trader_tier || 'limited',
          riskProfile: row.risk_profile || 'moderate',
          winRate: parseFloat(row.win_rate || 0),
          profitFactor: parseFloat(row.profit_factor || 0),
          sharpeRatio: parseFloat(row.sharpe_ratio || 0),
          maxDrawdown: parseFloat(row.max_drawdown || 0),
          totalProfit: parseFloat(row.total_profit || 0),
          totalVolume: parseFloat(row.total_volume || 0),
          tradeCount: parseInt(row.trade_count || 0),
          rank: parseInt(row.rank || 0),
          eliteRank: row.elite_rank ? parseInt(row.elite_rank) : null,
          primaryCategory: row.primary_category,
          categorySpecialization: row.category_specialization,
          strengths: generateStrengths(row),
          warnings: generateWarnings(row),
          isRecommended: row.trader_tier === 'elite' && parseFloat(row.elite_score) >= 80,
        }));
        
        return { leaderboard };
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to fetch leaderboard" });
      }
    }
  );
}

// Helper functions
function generateStrengths(row: any): string[] {
  const strengths: string[] = [];
  const winRate = parseFloat(row.win_rate || 0);
  const profitFactor = parseFloat(row.profit_factor || 0);
  const sharpeRatio = parseFloat(row.sharpe_ratio || 0);
  const maxDrawdown = parseFloat(row.max_drawdown || 0);
  
  if (winRate >= 80) strengths.push("Exceptional win rate");
  if (profitFactor >= 3.0) strengths.push("Outstanding profit factor");
  if (sharpeRatio >= 2.0) strengths.push("Excellent risk-adjusted returns");
  if (maxDrawdown <= 15) strengths.push("Strong risk management");
  if (parseInt(row.longest_win_streak || 0) >= 7) strengths.push("Consistent winning streaks");
  
  return strengths;
}

function generateWarnings(row: any): string[] {
  const warnings: string[] = [];
  const tradeCount = parseInt(row.trade_count || 0);
  const maxDrawdown = parseFloat(row.max_drawdown || 0);
  const winRate = parseFloat(row.win_rate || 0);
  const profitFactor = parseFloat(row.profit_factor || 0);
  
  if (tradeCount < 20) warnings.push("Limited trade history");
  if (maxDrawdown > 30) warnings.push("High drawdown risk");
  if (winRate < 50) warnings.push("Below 50% win rate");
  if (profitFactor < 1.0) warnings.push("Losing more than winning");
  
  return warnings;
}
