/**
 * Copy Trading System API
 * 
 * Complete copy trading functionality with trader following, position mirroring,
 * stop-loss synchronization, and real-time monitoring.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

// ============================================================================
// SCHEMAS
// ============================================================================

const FollowTraderSchema = z.object({
  traderAddress: z.string(),
  copyPercentage: z.number().min(10).max(100).default(100),
  autoCopyEnabled: z.boolean().default(true),
  maxPositionSize: z.number().positive().optional(),
  maxDailyLoss: z.number().positive().optional(),
  copyStopLoss: z.boolean().default(true),
  copyTakeProfit: z.boolean().default(true),
  syncExits: z.boolean().default(true),
});

const CopyTradeSchema = z.object({
  signalId: z.string().uuid(),
  traderAddress: z.string(),
  customCopyPercentage: z.number().min(10).max(100).optional(),
});

const UpdateFollowSchema = z.object({
  copyPercentage: z.number().min(10).max(100).optional(),
  autoCopyEnabled: z.boolean().optional(),
  maxPositionSize: z.number().positive().optional(),
  maxDailyLoss: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

const CloseCopiedPositionSchema = z.object({
  reason: z.enum(['manual', 'stop_loss', 'take_profit', 'sync_exit']),
});

export async function copyTradingRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ==========================================================================
  // POST /api/copy-trading/follow
  // Follow an Elite Trader
  // ==========================================================================
  typedApp.post(
    "/api/copy-trading/follow",
    {
      schema: {
        body: z.object({
          userAddress: z.string(),
          ...FollowTraderSchema.shape,
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            followId: z.string(),
            message: z.string(),
            traderInfo: z.object({
              address: z.string(),
              eliteScore: z.number(),
              winRate: z.number(),
              totalProfit: z.number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { userAddress, traderAddress, ...settings } = request.body;
      
      try {
        // Check if trader exists and is elite
        const traderResult = await db.execute(sql`
          SELECT wallet_address, elite_score, win_rate, total_profit
          FROM wallet_performance
          WHERE wallet_address = ${traderAddress}
            AND elite_score >= 60
        `);

        if (traderResult.length === 0) {
          return reply.status(404).send({ error: "Trader not found or not elite" });
        }

        const trader = traderResult[0];

        // Create follow relationship
        const followResult = await db.execute(sql`
          INSERT INTO trader_follows (
            user_address,
            trader_address,
            copy_percentage,
            auto_copy_enabled,
            max_position_size,
            max_daily_loss,
            copy_stop_loss,
            copy_take_profit,
            sync_exits
          ) VALUES (
            ${userAddress},
            ${traderAddress},
            ${settings.copyPercentage},
            ${settings.autoCopyEnabled},
            ${settings.maxPositionSize || null},
            ${settings.maxDailyLoss || null},
            ${settings.copyStopLoss},
            ${settings.copyTakeProfit},
            ${settings.syncExits}
          )
          ON CONFLICT (user_address, trader_address) 
          DO UPDATE SET
            is_active = true,
            copy_percentage = EXCLUDED.copy_percentage,
            updated_at = NOW()
          RETURNING id
        `);

        const followId = followResult[0].id;

        return {
          success: true,
          followId,
          message: `Successfully following ${traderAddress.slice(0, 6)}...${traderAddress.slice(-4)}`,
          traderInfo: {
            address: traderAddress,
            eliteScore: parseFloat(trader.elite_score),
            winRate: parseFloat(trader.win_rate),
            totalProfit: parseFloat(trader.total_profit),
          },
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to follow trader" });
      }
    }
  );

  // ==========================================================================
  // DELETE /api/copy-trading/unfollow/:traderAddress
  // Unfollow a Trader
  // ==========================================================================
  typedApp.delete(
    "/api/copy-trading/unfollow/:traderAddress",
    {
      schema: {
        params: z.object({
          traderAddress: z.string(),
        }),
        querystring: z.object({
          userAddress: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { traderAddress } = request.params;
      const { userAddress } = request.query;
      
      try {
        await db.execute(sql`
          UPDATE trader_follows
          SET is_active = false, updated_at = NOW()
          WHERE user_address = ${userAddress}
            AND trader_address = ${traderAddress}
        `);

        return {
          success: true,
          message: `Unfollowed ${traderAddress.slice(0, 6)}...${traderAddress.slice(-4)}`,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to unfollow trader" });
      }
    }
  );

  // ==========================================================================
  // GET /api/copy-trading/following
  // Get All Followed Traders
  // ==========================================================================
  typedApp.get(
    "/api/copy-trading/following",
    {
      schema: {
        querystring: z.object({
          userAddress: z.string(),
        }),
        response: {
          200: z.object({
            following: z.array(z.object({
              followId: z.string(),
              traderAddress: z.string(),
              copyPercentage: z.number(),
              isActive: z.boolean(),
              autoCopyEnabled: z.boolean(),
              totalCopiedTrades: z.number(),
              profitableTrades: z.number(),
              losingTrades: z.number(),
              totalProfitLoss: z.number(),
              roiPercentage: z.number(),
              winRate: z.number(),
              traderEliteScore: z.number(),
              traderWinRate: z.number(),
              openPositions: z.number(),
              followedAt: z.string(),
            })),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { userAddress } = request.query;
      
      try {
        const result = await db.execute(sql`
          SELECT 
            follow_id,
            trader_address,
            copy_percentage,
            is_active,
            tf.auto_copy_enabled,
            total_copied_trades,
            profitable_trades,
            losing_trades,
            total_profit_loss,
            roi_percentage,
            win_rate,
            trader_elite_score,
            trader_win_rate,
            open_positions,
            followed_at
          FROM trader_follow_performance tf
          WHERE user_address = ${userAddress}
          ORDER BY is_active DESC, followed_at DESC
        `);

        const following = result.map((row: any) => ({
          followId: row.follow_id,
          traderAddress: row.trader_address,
          copyPercentage: parseFloat(row.copy_percentage),
          isActive: row.is_active,
          autoCopyEnabled: row.auto_copy_enabled,
          totalCopiedTrades: parseInt(row.total_copied_trades || 0),
          profitableTrades: parseInt(row.profitable_trades || 0),
          losingTrades: parseInt(row.losing_trades || 0),
          totalProfitLoss: parseFloat(row.total_profit_loss || 0),
          roiPercentage: parseFloat(row.roi_percentage || 0),
          winRate: parseFloat(row.win_rate || 0),
          traderEliteScore: parseFloat(row.trader_elite_score || 0),
          traderWinRate: parseFloat(row.trader_win_rate || 0),
          openPositions: parseInt(row.open_positions || 0),
          followedAt: row.followed_at?.toISOString() || new Date().toISOString(),
        }));

        return {
          following,
          total: following.length,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch following list" });
      }
    }
  );

  // ==========================================================================
  // POST /api/copy-trading/copy
  // One-Click Copy Trade
  // ==========================================================================
  typedApp.post(
    "/api/copy-trading/copy",
    {
      schema: {
        body: z.object({
          userAddress: z.string(),
          ...CopyTradeSchema.shape,
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            positionId: z.string(),
            copiedPosition: z.object({
              marketQuestion: z.string(),
              outcome: z.string(),
              entryPrice: z.number(),
              positionSize: z.number(),
              shares: z.number(),
              stopLoss: z.number(),
              takeProfit: z.number(),
              copyPercentage: z.number(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { userAddress, signalId, traderAddress, customCopyPercentage } = request.body;
      
      try {
        // Get signal details
        const signalResult = await db.execute(sql`
          SELECT 
            bbs.*,
            m.question as market_question,
            m.id as market_id
          FROM best_bet_signals bbs
          JOIN markets m ON m.id = bbs.market_id
          WHERE bbs.id = ${signalId}
            AND bbs.trader_address = ${traderAddress}
            AND bbs.status = 'active'
        `);

        if (signalResult.length === 0) {
          return reply.status(404).send({ error: "Signal not found or inactive" });
        }

        const signal = signalResult[0];

        // Get follow relationship
        const followResult = await db.execute(sql`
          SELECT id, copy_percentage, max_position_size
          FROM trader_follows
          WHERE user_address = ${userAddress}
            AND trader_address = ${traderAddress}
            AND is_active = true
        `);

        if (followResult.length === 0) {
          return reply.status(400).send({ error: "Not following this trader" });
        }

        const follow = followResult[0];
        const copyPercentage = customCopyPercentage || parseFloat(follow.copy_percentage);

        // Get user settings
        const settingsResult = await db.execute(sql`
          SELECT total_copy_bankroll
          FROM copy_trading_settings
          WHERE user_address = ${userAddress}
        `);

        const bankroll = settingsResult.length > 0 
          ? parseFloat(settingsResult[0].total_copy_bankroll)
          : 10000; // Default

        // Calculate position size
        const originalSize = parseFloat(signal.position_size);
        const calculatedSize = originalSize * (copyPercentage / 100);
        const finalSize = follow.max_position_size && calculatedSize > parseFloat(follow.max_position_size)
          ? parseFloat(follow.max_position_size)
          : calculatedSize;

        const entryPrice = parseFloat(signal.entry_price);
        const shares = finalSize / entryPrice;

        // Create copied position
        const positionResult = await db.execute(sql`
          INSERT INTO copied_positions (
            user_address,
            trader_address,
            follow_id,
            signal_id,
            market_id,
            outcome,
            entry_price,
            position_size,
            shares,
            stop_loss,
            take_profit,
            copy_percentage,
            executed_at,
            current_price
          ) VALUES (
            ${userAddress},
            ${traderAddress},
            ${follow.id},
            ${signalId},
            ${signal.market_id},
            ${signal.outcome},
            ${entryPrice},
            ${finalSize},
            ${shares},
            ${parseFloat(signal.stop_loss)},
            ${parseFloat(signal.target_price)},
            ${copyPercentage},
            NOW(),
            ${entryPrice}
          )
          RETURNING id
        `);

        const positionId = positionResult[0].id;

        // Log the copy trade
        await db.execute(sql`
          INSERT INTO copy_trade_log (
            user_address,
            trader_address,
            follow_id,
            action,
            market_id,
            position_size,
            price,
            outcome,
            success
          ) VALUES (
            ${userAddress},
            ${traderAddress},
            ${follow.id},
            'copy_open',
            ${signal.market_id},
            ${finalSize},
            ${entryPrice},
            ${signal.outcome},
            true
          )
        `);

        // Update follow stats
        await db.execute(sql`
          UPDATE trader_follows
          SET 
            last_copy_at = NOW(),
            updated_at = NOW()
          WHERE id = ${follow.id}
        `);

        return {
          success: true,
          positionId,
          copiedPosition: {
            marketQuestion: signal.market_question,
            outcome: signal.outcome,
            entryPrice,
            positionSize: finalSize,
            shares,
            stopLoss: parseFloat(signal.stop_loss),
            takeProfit: parseFloat(signal.target_price),
            copyPercentage,
          },
          message: `Successfully copied trade from ${traderAddress.slice(0, 6)}...${traderAddress.slice(-4)}`,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to copy trade" });
      }
    }
  );

  // ==========================================================================
  // GET /api/copy-trading/positions
  // Get Copied Positions with Real-time Monitoring
  // ==========================================================================
  typedApp.get(
    "/api/copy-trading/positions",
    {
      schema: {
        querystring: z.object({
          userAddress: z.string(),
          status: z.enum(['open', 'closed', 'all']).default('open'),
        }),
        response: {
          200: z.object({
            positions: z.array(z.object({
              id: z.string(),
              traderAddress: z.string(),
              marketQuestion: z.string(),
              outcome: z.string(),
              entryPrice: z.number(),
              currentPrice: z.number(),
              positionSize: z.number(),
              shares: z.number(),
              stopLoss: z.number(),
              takeProfit: z.number(),
              unrealizedPnl: z.number(),
              pnlPercentage: z.number(),
              shouldStopOut: z.boolean(),
              shouldTakeProfit: z.boolean(),
              daysOpen: z.number(),
              executedAt: z.string(),
              status: z.string(),
            })),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { userAddress, status } = request.query;
      
      try {
        let query = sql`
          SELECT *
          FROM active_copied_positions
          WHERE user_address = ${userAddress}
        `;

        if (status !== 'all') {
          // active_copied_positions only shows open positions
          if (status === 'closed') {
            query = sql`
              SELECT 
                cp.id,
                cp.trader_address,
                m.question as market_question,
                cp.outcome,
                cp.entry_price,
                cp.exit_price as current_price,
                cp.position_size,
                cp.shares,
                cp.stop_loss,
                cp.take_profit,
                cp.realized_pnl as unrealized_pnl,
                cp.roi_percentage as pnl_percentage,
                false as should_stop_out,
                false as should_take_profit,
                EXTRACT(EPOCH FROM (cp.closed_at - cp.executed_at)) / 86400 as days_open,
                cp.executed_at,
                cp.status
              FROM copied_positions cp
              LEFT JOIN markets m ON cp.market_id = m.id
              WHERE cp.user_address = ${userAddress}
                AND cp.status IN ('closed', 'stopped_out', 'target_hit')
              ORDER BY cp.closed_at DESC
            `;
          }
        }

        const result = await db.execute(query);

        const positions = result.map((row: any) => ({
          id: row.id,
          traderAddress: row.trader_address,
          marketQuestion: row.market_question,
          outcome: row.outcome,
          entryPrice: parseFloat(row.entry_price),
          currentPrice: parseFloat(row.current_price),
          positionSize: parseFloat(row.position_size),
          shares: parseFloat(row.shares),
          stopLoss: parseFloat(row.stop_loss),
          takeProfit: parseFloat(row.take_profit),
          unrealizedPnl: parseFloat(row.unrealized_pnl || 0),
          pnlPercentage: parseFloat(row.pnl_percentage || 0),
          shouldStopOut: row.should_stop_out || false,
          shouldTakeProfit: row.should_take_profit || false,
          daysOpen: parseFloat(row.days_open || 0),
          executedAt: row.executed_at?.toISOString() || new Date().toISOString(),
          status: row.status || 'open',
        }));

        return {
          positions,
          total: positions.length,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch positions" });
      }
    }
  );

  // ==========================================================================
  // POST /api/copy-trading/positions/:positionId/close
  // Close Copied Position
  // ==========================================================================
  typedApp.post(
    "/api/copy-trading/positions/:positionId/close",
    {
      schema: {
        params: z.object({
          positionId: z.string().uuid(),
        }),
        body: CloseCopiedPositionSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            closedPosition: z.object({
              id: z.string(),
              entryPrice: z.number(),
              exitPrice: z.number(),
              realizedPnl: z.number(),
              roiPercentage: z.number(),
            }),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { positionId } = request.params;
      const { reason } = request.body;
      
      try {
        // Get position
        const positionResult = await db.execute(sql`
          SELECT * FROM copied_positions WHERE id = ${positionId} AND status = 'open'
        `);

        if (positionResult.length === 0) {
          return reply.status(404).send({ error: "Position not found or already closed" });
        }

        const position = positionResult[0];
        
        // Mock exit price (would come from live market data)
        const exitPrice = parseFloat(position.current_price);
        const entryPrice = parseFloat(position.entry_price);
        const shares = parseFloat(position.shares);
        
        // Calculate P&L
        const realizedPnl = position.outcome === 'yes'
          ? (exitPrice - entryPrice) * shares
          : (entryPrice - exitPrice) * shares;
        
        const roiPercentage = (realizedPnl / parseFloat(position.position_size)) * 100;

        // Close position
        await db.execute(sql`
          UPDATE copied_positions
          SET 
            status = ${reason === 'stop_loss' ? 'stopped_out' : 
                     reason === 'take_profit' ? 'target_hit' : 'closed'},
            exit_price = ${exitPrice},
            exit_reason = ${reason},
            closed_at = NOW(),
            realized_pnl = ${realizedPnl},
            roi_percentage = ${roiPercentage},
            updated_at = NOW()
          WHERE id = ${positionId}
        `);

        // Log the close
        await db.execute(sql`
          INSERT INTO copy_trade_log (
            user_address,
            trader_address,
            follow_id,
            action,
            market_id,
            position_size,
            price,
            outcome,
            success,
            pnl
          ) VALUES (
            ${position.user_address},
            ${position.trader_address},
            ${position.follow_id},
            ${reason},
            ${position.market_id},
            ${position.position_size},
            ${exitPrice},
            ${position.outcome},
            true,
            ${realizedPnl}
          )
        `);

        // Update follow performance
        await db.execute(sql`SELECT update_follow_performance(${position.follow_id})`);

        return {
          success: true,
          closedPosition: {
            id: positionId,
            entryPrice,
            exitPrice,
            realizedPnl,
            roiPercentage,
          },
          message: `Position closed with ${realizedPnl >= 0 ? 'profit' : 'loss'}: $${Math.abs(realizedPnl).toFixed(2)}`,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to close position" });
      }
    }
  );

  // ==========================================================================
  // GET /api/copy-trading/dashboard
  // User Copy Trading Dashboard
  // ==========================================================================
  typedApp.get(
    "/api/copy-trading/dashboard",
    {
      schema: {
        querystring: z.object({
          userAddress: z.string(),
        }),
        response: {
          200: z.object({
            overview: z.object({
              followingCount: z.number(),
              openPositions: z.number(),
              totalExposure: z.number(),
              unrealizedPnl: z.number(),
              totalRealizedPnl: z.number(),
              totalWins: z.number(),
              totalLosses: z.number(),
            }),
            settings: z.object({
              totalCopyBankroll: z.number(),
              maxRiskPerTrade: z.number(),
              autoCopyEnabled: z.boolean(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { userAddress } = request.query;
      
      try {
        const result = await db.execute(sql`
          SELECT * FROM user_copy_dashboard WHERE user_address = ${userAddress}
        `);

        if (result.length === 0) {
          // Create default settings
          await db.execute(sql`
            INSERT INTO copy_trading_settings (user_address, total_copy_bankroll)
            VALUES (${userAddress}, 10000)
          `);

          return {
            overview: {
              followingCount: 0,
              openPositions: 0,
              totalExposure: 0,
              unrealizedPnl: 0,
              totalRealizedPnl: 0,
              totalWins: 0,
              totalLosses: 0,
            },
            settings: {
              totalCopyBankroll: 10000,
              maxRiskPerTrade: 5.0,
              autoCopyEnabled: true,
            },
          };
        }

        const dashboard = result[0];

        return {
          overview: {
            followingCount: parseInt(dashboard.following_count || 0),
            openPositions: parseInt(dashboard.open_positions || 0),
            totalExposure: parseFloat(dashboard.total_exposure || 0),
            unrealizedPnl: parseFloat(dashboard.unrealized_pnl || 0),
            totalRealizedPnl: parseFloat(dashboard.total_realized_pnl || 0),
            totalWins: parseInt(dashboard.total_wins || 0),
            totalLosses: parseInt(dashboard.total_losses || 0),
          },
          settings: {
            totalCopyBankroll: parseFloat(dashboard.total_copy_bankroll || 10000),
            maxRiskPerTrade: parseFloat(dashboard.max_risk_per_trade || 5.0),
            autoCopyEnabled: dashboard.auto_copy_enabled !== false,
          },
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch dashboard" });
      }
    }
  );
}
