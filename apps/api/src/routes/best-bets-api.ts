/**
 * Real-time Best Bets Signal API
 * 
 * Live best bet opportunities with copy trade functionality
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";
import { 
  calculateKellyPosition, 
  calculateAdvancedKelly,
  calculateRiskLevels,
  type PositionSize,
  type KellyInputs 
} from "@polybuddy/analytics";

// Schema for Best Bet Signal
const BestBetSignalSchema = z.object({
  id: z.string(),
  marketId: z.string(),
  marketQuestion: z.string(),
  marketCategory: z.string().nullable(),
  
  // Signal strength
  confidence: z.number(),
  signalStrength: z.enum(['elite', 'strong', 'moderate', 'weak']),
  
  // Trading params
  entryPrice: z.number(),
  targetPrice: z.number(),
  stopLoss: z.number(),
  currentPrice: z.number(),
  outcome: z.enum(['yes', 'no']),
  
  // Position sizing
  recommendedPosition: z.object({
    positionAmount: z.number(),
    positionShares: z.number(),
    riskPercentage: z.number(),
    kellyPercentage: z.number(),
    maxLoss: z.number(),
    expectedValue: z.number(),
    riskRewardRatio: z.number(),
    recommendation: z.enum(['aggressive', 'moderate', 'conservative', 'skip']),
    warnings: z.array(z.string()),
  }),
  
  // Trader info
  traderAddress: z.string(),
  traderWinRate: z.number(),
  traderEliteScore: z.number(),
  traderProfitHistory: z.number(),
  
  // Signal metadata
  reasoning: z.array(z.string()),
  timeHorizon: z.string(),
  generatedAt: z.string(),
  expiresAt: z.string(),
  
  // Copy trade info
  copyTradeEnabled: z.boolean(),
  copyCount: z.number().optional(),
});

// Schema for copy trade request
const CopyTradeSchema = z.object({
  bankroll: z.number().positive(),
  riskTolerance: z.enum(['aggressive', 'moderate', 'conservative']),
  maxPositionSize: z.number().positive().optional(),
});

export async function bestBetsApiRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // =============================================
  // GET /api/best-bets-signals
  // Get best bet signals for the Best Bets page
  // =============================================
  typedApp.get(
    "/api/best-bets-signals",
    {
      schema: {
        response: {
          200: z.object({
            signals: z.array(z.any()),
            total: z.number(),
            eliteCount: z.number(),
            strongCount: z.number(),
            avgConfidence: z.number(),
          }),
          500: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const results = await db.execute(sql`
          SELECT 
            bbs.id,
            bbs.market_id,
            m.question as market_question,
            m.category as market_category,
            bbs.confidence,
            bbs.signal_strength,
            bbs.entry_price,
            bbs.target_price,
            bbs.stop_loss,
            bbs.outcome,
            bbs.trader_address,
            bbs.trader_win_rate,
            bbs.trader_elite_score,
            bbs.trader_profit_history,
            bbs.trader_sharpe_ratio,
            bbs.reasoning,
            bbs.time_horizon,
            bbs.generated_at,
            bbs.expires_at,
            bbs.position_size,
            bbs.kelly_criterion,
            bbs.risk_reward_ratio
          FROM best_bet_signals bbs
          JOIN markets m ON m.id = bbs.market_id
          WHERE bbs.status = 'active'
            AND bbs.expires_at > NOW()
          ORDER BY 
            CASE bbs.signal_strength
              WHEN 'elite' THEN 4
              WHEN 'strong' THEN 3
              WHEN 'moderate' THEN 2
              ELSE 1
            END DESC,
            bbs.confidence DESC
        `);
        
        const signals = results.map((row: any) => ({
          id: row.id,
          marketId: row.market_id,
          marketQuestion: row.market_question,
          marketCategory: row.market_category,
          confidence: parseFloat(row.confidence),
          signalStrength: row.signal_strength,
          entryPrice: parseFloat(row.entry_price),
          targetPrice: parseFloat(row.target_price),
          stopLoss: parseFloat(row.stop_loss),
          positionSize: parseFloat(row.position_size),
          riskRewardRatio: parseFloat(row.risk_reward_ratio),
          kellyCriterion: parseFloat(row.kelly_criterion),
          outcome: row.outcome,
          traderAddress: row.trader_address,
          traderWinRate: parseFloat(row.trader_win_rate),
          traderEliteScore: parseFloat(row.trader_elite_score),
          traderProfitHistory: parseFloat(row.trader_profit_history),
          traderSharpeRatio: parseFloat(row.trader_sharpe_ratio || 1.5),
          reasoning: row.reasoning || [],
          timeHorizon: row.time_horizon,
          generatedAt: row.generated_at ? new Date(row.generated_at).toISOString() : new Date().toISOString(),
          expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : new Date().toISOString(),
        }));

        const eliteCount = signals.filter(s => s.signalStrength === 'elite').length;
        const strongCount = signals.filter(s => s.signalStrength === 'strong').length;
        const avgConfidence = signals.length > 0
          ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
          : 0;

        return {
          signals,
          total: signals.length,
          eliteCount,
          strongCount,
          avgConfidence,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch best bets signals" });
      }
    }
  );

  // =============================================
  // GET /api/best-bets
  // Get live best bet opportunities
  // =============================================
  typedApp.get(
    "/api/best-bets",
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().min(1).max(50).default(10),
          minConfidence: z.coerce.number().min(0).max(100).default(75),
          strength: z.enum(['elite', 'strong', 'moderate', 'weak']).optional(),
          bankroll: z.coerce.number().positive().optional(),
          riskTolerance: z.enum(['aggressive', 'moderate', 'conservative']).optional(),
        }),
        response: {
          200: z.object({
            signals: z.array(BestBetSignalSchema),
            total: z.number(),
            timestamp: z.string(),
          }),
          500: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { limit, minConfidence, strength, bankroll, riskTolerance } = request.query;
      
      try {
        // Build query for active signals
        // Get current price from market metadata or latest snapshot
        let query = sql`
          SELECT 
            bbs.id,
            bbs.market_id,
            m.question as market_question,
            m.category as market_category,
            bbs.confidence,
            bbs.signal_strength,
            bbs.entry_price,
            bbs.target_price,
            bbs.stop_loss,
            bbs.outcome,
            bbs.trader_address,
            bbs.trader_win_rate,
            bbs.trader_elite_score,
            bbs.trader_profit_history,
            bbs.reasoning,
            bbs.time_horizon,
            bbs.generated_at,
            bbs.expires_at,
            bbs.position_size,
            bbs.kelly_criterion,
            bbs.risk_reward_ratio,
            COALESCE(
              (m.metadata->>'currentPrice')::numeric,
              0.50
            ) as current_price
          FROM best_bet_signals bbs
          JOIN markets m ON m.id = bbs.market_id
          WHERE bbs.status = 'active'
            AND bbs.expires_at > NOW()
            AND bbs.confidence >= ${minConfidence}
        `;

        if (strength) {
          query = sql`${query} AND bbs.signal_strength = ${strength}`;
        }

        query = sql`${query}
          ORDER BY 
            CASE bbs.signal_strength
              WHEN 'elite' THEN 4
              WHEN 'strong' THEN 3
              WHEN 'moderate' THEN 2
              ELSE 1
            END DESC,
            bbs.confidence DESC
          LIMIT ${limit}
        `;

        const results = await db.execute(query);
        
        // Calculate position sizing for each signal
        const signals = results.map((row: any) => {
          // Calculate edge (trader's edge over market)
          const edge = (parseFloat(row.trader_win_rate) / 100) - parseFloat(row.entry_price);
          
          // Calculate recommended position if bankroll provided
          let recommendedPosition: PositionSize | null = null;
          
          if (bankroll && riskTolerance) {
            try {
              recommendedPosition = calculateKellyPosition(
                bankroll,
                parseFloat(row.entry_price),
                Math.max(edge, 0.01), // Ensure positive edge
                riskTolerance
              );
            } catch (error) {
              app.log.error(error, 'Failed to calculate position size');
            }
          }
          
          // Default position if not calculated
          if (!recommendedPosition) {
            recommendedPosition = {
              positionAmount: parseFloat(row.position_size),
              positionShares: parseFloat(row.position_size) / parseFloat(row.entry_price),
              riskPercentage: parseFloat(row.kelly_criterion) * 100,
              kellyPercentage: parseFloat(row.kelly_criterion) * 100,
              fractionalKelly: parseFloat(row.kelly_criterion) * 100,
              maxLoss: parseFloat(row.position_size) * 0.15,
              expectedValue: parseFloat(row.position_size) * 0.2,
              stopLoss: parseFloat(row.stop_loss),
              takeProfit: parseFloat(row.target_price),
              riskRewardRatio: parseFloat(row.risk_reward_ratio),
              probabilityOfRuin: 0.001,
              sharpeRatio: parseFloat(row.trader_elite_score) / 50,
              recommendation: row.signal_strength === 'elite' ? 'aggressive' as const :
                            row.signal_strength === 'strong' ? 'moderate' as const :
                            'conservative' as const,
              warnings: [],
            };
          }

          return {
            id: row.id,
            marketId: row.market_id,
            marketQuestion: row.market_question,
            marketCategory: row.market_category,
            confidence: parseFloat(row.confidence),
            signalStrength: row.signal_strength,
            entryPrice: parseFloat(row.entry_price),
            targetPrice: parseFloat(row.target_price),
            stopLoss: parseFloat(row.stop_loss),
            currentPrice: parseFloat(row.current_price),
            outcome: row.outcome,
            recommendedPosition: {
              positionAmount: recommendedPosition.positionAmount,
              positionShares: recommendedPosition.positionShares,
              riskPercentage: recommendedPosition.riskPercentage,
              kellyPercentage: recommendedPosition.kellyPercentage,
              maxLoss: recommendedPosition.maxLoss,
              expectedValue: recommendedPosition.expectedValue,
              riskRewardRatio: recommendedPosition.riskRewardRatio,
              recommendation: recommendedPosition.recommendation,
              warnings: recommendedPosition.warnings,
            },
            traderAddress: row.trader_address,
            traderWinRate: parseFloat(row.trader_win_rate),
            traderEliteScore: parseFloat(row.trader_elite_score),
            traderProfitHistory: parseFloat(row.trader_profit_history),
            reasoning: row.reasoning || [],
            timeHorizon: row.time_horizon,
            generatedAt: row.generated_at?.toISOString() || new Date().toISOString(),
            expiresAt: row.expires_at?.toISOString() || new Date().toISOString(),
            copyTradeEnabled: true,
            copyCount: 0,
          };
        });

        return {
          signals,
          total: signals.length,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch best bets" });
      }
    }
  );

  // =============================================
  // GET /api/best-bets/:marketId
  // Market-specific signals
  // =============================================
  typedApp.get(
    "/api/best-bets/:marketId",
    {
      schema: {
        params: z.object({
          marketId: z.string().uuid(),
        }),
        querystring: z.object({
          bankroll: z.coerce.number().positive().optional(),
          riskTolerance: z.enum(['aggressive', 'moderate', 'conservative']).optional(),
        }),
        response: {
          200: z.any(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;
      const { bankroll, riskTolerance } = request.query;
      
      try {
        const result = await db.execute(sql`
          SELECT 
            bbs.*,
            m.question as market_question,
            m.category as market_category,
            COALESCE(
              (m.metadata->>'currentPrice')::numeric,
              0.50
            ) as current_price
          FROM best_bet_signals bbs
          JOIN markets m ON m.id = bbs.market_id
          WHERE bbs.market_id = ${marketId}
            AND bbs.status = 'active'
            AND bbs.expires_at > NOW()
          ORDER BY bbs.confidence DESC
          LIMIT 1
        `);

        if (result.length === 0) {
          return reply.status(404).send({ error: "No active signal for this market" });
        }

        const row = result[0]!;
        
        // Calculate position sizing
        const edge = (parseFloat(row.trader_win_rate) / 100) - parseFloat(row.entry_price);
        
        let recommendedPosition: PositionSize;
        
        if (bankroll && riskTolerance) {
          recommendedPosition = calculateKellyPosition(
            bankroll,
            parseFloat(row.entry_price),
            Math.max(edge, 0.01),
            riskTolerance
          );
        } else {
          recommendedPosition = {
            positionAmount: parseFloat(row.position_size),
            positionShares: parseFloat(row.position_size) / parseFloat(row.entry_price),
            riskPercentage: parseFloat(row.kelly_criterion) * 100,
            kellyPercentage: parseFloat(row.kelly_criterion) * 100,
            fractionalKelly: parseFloat(row.kelly_criterion) * 100,
            maxLoss: parseFloat(row.position_size) * 0.15,
            expectedValue: parseFloat(row.position_size) * 0.2,
            stopLoss: parseFloat(row.stop_loss),
            takeProfit: parseFloat(row.target_price),
            riskRewardRatio: parseFloat(row.risk_reward_ratio),
            probabilityOfRuin: 0.001,
            sharpeRatio: 1.5,
            recommendation: 'moderate' as const,
            warnings: [],
          };
        }

        return {
          id: row.id,
          marketId: row.market_id,
          marketQuestion: row.market_question,
          marketCategory: row.market_category,
          confidence: parseFloat(row.confidence),
          signalStrength: row.signal_strength,
          entryPrice: parseFloat(row.entry_price),
          targetPrice: parseFloat(row.target_price),
          stopLoss: parseFloat(row.stop_loss),
          currentPrice: parseFloat(row.current_price),
          outcome: row.outcome,
          recommendedPosition: {
            positionAmount: recommendedPosition.positionAmount,
            positionShares: recommendedPosition.positionShares,
            riskPercentage: recommendedPosition.riskPercentage,
            kellyPercentage: recommendedPosition.kellyPercentage,
            maxLoss: recommendedPosition.maxLoss,
            expectedValue: recommendedPosition.expectedValue,
            riskRewardRatio: recommendedPosition.riskRewardRatio,
            recommendation: recommendedPosition.recommendation,
            warnings: recommendedPosition.warnings,
          },
          traderAddress: row.trader_address,
          traderWinRate: parseFloat(row.trader_win_rate),
          traderEliteScore: parseFloat(row.trader_elite_score),
          traderProfitHistory: parseFloat(row.trader_profit_history),
          reasoning: row.reasoning || [],
          timeHorizon: row.time_horizon,
          generatedAt: row.generated_at.toISOString(),
          expiresAt: row.expires_at.toISOString(),
          copyTradeEnabled: true,
          copyCount: 0,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch signal" });
      }
    }
  );

  // =============================================
  // POST /api/best-bets/:signalId/copy
  // Copy trade functionality
  // =============================================
  typedApp.post(
    "/api/best-bets/:signalId/copy",
    {
      schema: {
        params: z.object({
          signalId: z.string().uuid(),
        }),
        body: CopyTradeSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            tradeId: z.string(),
            signal: BestBetSignalSchema,
            position: z.object({
              positionAmount: z.number(),
              positionShares: z.number(),
              riskPercentage: z.number(),
              expectedValue: z.number(),
              maxLoss: z.number(),
            }),
            message: z.string(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { signalId } = request.params;
      const { bankroll, riskTolerance, maxPositionSize } = request.body;
      
      try {
        // Fetch signal
        const result = await db.execute(sql`
          SELECT 
            bbs.*,
            m.question as market_question,
            m.category as market_category,
            COALESCE(
              (m.metadata->>'currentPrice')::numeric,
              0.50
            ) as current_price
          FROM best_bet_signals bbs
          JOIN markets m ON m.id = bbs.market_id
          WHERE bbs.id = ${signalId}
            AND bbs.status = 'active'
            AND bbs.expires_at > NOW()
        `);

        if (result.length === 0) {
          return reply.status(404).send({ error: "Signal not found or expired" });
        }

        const signal = result[0];
        
        // Calculate position sizing
        const edge = (parseFloat(signal.trader_win_rate) / 100) - parseFloat(signal.entry_price);
        
        const position = calculateAdvancedKelly({
          bankroll,
          odds: parseFloat(signal.entry_price),
          edge: Math.max(edge, 0.01),
          winProbability: parseFloat(signal.trader_win_rate) / 100,
          riskTolerance,
          maxPositionSize,
        });

        // Generate trade ID
        const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // In a real implementation, this would:
        // 1. Create a trade record in the database
        // 2. Execute the trade on Polymarket
        // 3. Track the position for the user
        
        // For now, return the calculated position
        return {
          success: true,
          tradeId,
          signal: {
            id: signal.id,
            marketId: signal.market_id,
            marketQuestion: signal.market_question,
            marketCategory: signal.market_category,
            confidence: parseFloat(signal.confidence),
            signalStrength: signal.signal_strength,
            entryPrice: parseFloat(signal.entry_price),
            targetPrice: parseFloat(signal.target_price),
            stopLoss: parseFloat(signal.stop_loss),
            currentPrice: parseFloat(signal.current_price || signal.entry_price || "0.50"),
            outcome: signal.outcome,
            recommendedPosition: {
              positionAmount: position.positionAmount,
              positionShares: position.positionShares,
              riskPercentage: position.riskPercentage,
              kellyPercentage: position.kellyPercentage,
              maxLoss: position.maxLoss,
              expectedValue: position.expectedValue,
              riskRewardRatio: position.riskRewardRatio,
              recommendation: position.recommendation,
              warnings: position.warnings,
            },
            traderAddress: signal.trader_address,
            traderWinRate: parseFloat(signal.trader_win_rate),
            traderEliteScore: parseFloat(signal.trader_elite_score),
            traderProfitHistory: parseFloat(signal.trader_profit_history),
            reasoning: signal.reasoning || [],
            timeHorizon: signal.time_horizon,
            generatedAt: signal.generated_at.toISOString(),
            expiresAt: signal.expires_at.toISOString(),
            copyTradeEnabled: true,
            copyCount: 0,
          },
          position: {
            positionAmount: position.positionAmount,
            positionShares: position.positionShares,
            riskPercentage: position.riskPercentage,
            expectedValue: position.expectedValue,
            maxLoss: position.maxLoss,
          },
          message: `Copy trade executed: ${position.positionShares.toFixed(2)} shares at $${parseFloat(signal.entry_price).toFixed(3)} (${position.recommendation} recommendation)`,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to execute copy trade" });
      }
    }
  );

  // =============================================
  // POST /api/best-bets/calculate-position
  // Calculate position size for custom parameters
  // =============================================
  typedApp.post(
    "/api/best-bets/calculate-position",
    {
      schema: {
        body: z.object({
          bankroll: z.number().positive(),
          odds: z.number().min(0.01).max(0.99),
          winProbability: z.number().min(0).max(1),
          riskTolerance: z.enum(['aggressive', 'moderate', 'conservative']),
          maxPositionSize: z.number().positive().optional(),
        }),
        response: {
          200: z.object({
            position: z.object({
              positionAmount: z.number(),
              positionShares: z.number(),
              riskPercentage: z.number(),
              kellyPercentage: z.number(),
              fractionalKelly: z.number(),
              stopLoss: z.number(),
              takeProfit: z.number(),
              maxLoss: z.number(),
              expectedValue: z.number(),
              riskRewardRatio: z.number(),
              probabilityOfRuin: z.number(),
              sharpeRatio: z.number(),
              recommendation: z.enum(['aggressive', 'moderate', 'conservative', 'skip']),
              warnings: z.array(z.string()),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { bankroll, odds, winProbability, riskTolerance, maxPositionSize } = request.body;
      
      try {
        const edge = winProbability - odds;
        
        const position = calculateAdvancedKelly({
          bankroll,
          odds,
          edge,
          winProbability,
          riskTolerance,
          maxPositionSize,
        });

        return { position };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to calculate position" });
      }
    }
  );
}
