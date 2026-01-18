import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

/**
 * Pattern Recognition API Routes
 * 
 * AI-powered pattern analysis and predictions
 */

// Request/Response Schemas
const PatternAnalysisRequestSchema = z.object({
  entryPrice: z.number().min(0).max(1),
  positionSize: z.number().positive(),
  marketId: z.string().uuid(),
  marketCategory: z.string().optional(),
  marketPhase: z.enum(['early', 'mid', 'late']).optional(),
  holdingHours: z.number().positive().optional(),
});

const MarketIdParamSchema = z.object({
  marketId: z.string().uuid(),
});

const SimilarPatternsQuerySchema = z.object({
  minWinRate: z.coerce.number().min(0).max(100).optional().default(70),
  minConfidence: z.coerce.number().min(0).max(100).optional().default(75),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

export async function patternRecognitionRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/patterns/:marketId
   * Get trading patterns for a specific market
   */
  fastify.get<{
    Params: z.infer<typeof MarketIdParamSchema>;
    Querystring: { limit?: number };
  }>(
    "/api/patterns/:marketId",
    {
      schema: {
        params: MarketIdParamSchema,
        querystring: z.object({
          limit: z.coerce.number().min(1).max(50).optional().default(20),
        }),
        response: {
          200: z.object({
            patterns: z.array(z.any()),
            marketInfo: z.object({
              id: z.string(),
              question: z.string().nullable(),
              category: z.string().nullable(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;
      const { limit } = request.query;

      try {
        // Get market info
        const marketResult = await db.execute(sql`
          SELECT id, question, category
          FROM markets
          WHERE id = ${marketId}
        `);

        if (marketResult.rows.length === 0) {
          return reply.code(404).send({ error: "Market not found" });
        }

        const market = marketResult.rows[0] as any;

        // Get patterns for this market category
        const patternsResult = await db.execute(sql`
          SELECT 
            tp.*,
            COUNT(pm.id) FILTER (WHERE pm.matched_at > NOW() - INTERVAL '7 days') as recent_matches,
            AVG(pm.actual_roi) FILTER (WHERE pm.matched_at > NOW() - INTERVAL '30 days') as recent_avg_roi
          FROM trading_patterns tp
          LEFT JOIN pattern_matches pm ON tp.id = pm.pattern_id
          WHERE tp.market_category = ${market.category}
            OR tp.market_category IS NULL
          GROUP BY tp.id
          ORDER BY tp.win_rate DESC, tp.confidence_score DESC
          LIMIT ${limit}
        `);

        const patterns = patternsResult.rows.map((row: any) => ({
          id: row.id,
          patternType: row.pattern_type,
          patternName: row.pattern_name,
          patternSignature: row.pattern_signature,
          confidenceScore: parseFloat(row.confidence_score),
          entryPriceRange: row.entry_price_range,
          positionSizeRange: row.position_size_range,
          holdingPeriodHours: row.holding_period_hours,
          exitConditions: row.exit_conditions,
          occurrences: parseInt(row.occurrences),
          successfulOutcomes: parseInt(row.successful_outcomes),
          failedOutcomes: parseInt(row.failed_outcomes),
          winRate: parseFloat(row.win_rate),
          avgRoi: parseFloat(row.avg_roi),
          sharpeRatio: parseFloat(row.sharpe_ratio),
          marketCategory: row.market_category,
          marketPhase: row.market_phase,
          volatilityRange: row.volatility_range,
          eliteTradersUsing: row.elite_traders_using,
          avgTraderEliteScore: row.avg_trader_elite_score ? parseFloat(row.avg_trader_elite_score) : null,
          recentMatches: parseInt(row.recent_matches || 0),
          recentAvgRoi: row.recent_avg_roi ? parseFloat(row.recent_avg_roi) : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastOccurrenceAt: row.last_occurrence_at,
        }));

        return reply.send({
          patterns,
          marketInfo: {
            id: market.id,
            question: market.question,
            category: market.category,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch patterns" });
      }
    }
  );

  /**
   * POST /api/patterns/analyze
   * Analyze a trade and predict outcome based on patterns
   */
  fastify.post<{
    Body: z.infer<typeof PatternAnalysisRequestSchema>;
  }>(
    "/api/patterns/analyze",
    {
      schema: {
        body: PatternAnalysisRequestSchema,
        response: {
          200: z.object({
            prediction: z.object({
              outcome: z.enum(['win', 'loss']),
              confidence: z.number(),
              predictedRoi: z.number(),
              reasoning: z.array(z.string()),
            }),
            matchingPatterns: z.array(z.any()),
            marketSentiment: z.any().optional(),
            orderBookAnalysis: z.any().optional(),
          }),
        },
      },
    },
    async (request, reply) => {
      const trade = request.body;

      try {
        // Get all relevant patterns
        const patternsResult = await db.execute(sql`
          SELECT *
          FROM trading_patterns
          WHERE (market_category = (SELECT category FROM markets WHERE id = ${trade.marketId})
                 OR market_category IS NULL)
            AND win_rate >= 65
            AND confidence_score >= 70
          ORDER BY win_rate DESC, confidence_score DESC
          LIMIT 20
        `);

        const patterns = patternsResult.rows.map((row: any) => ({
          id: row.id,
          patternType: row.pattern_type,
          patternName: row.pattern_name,
          confidenceScore: parseFloat(row.confidence_score),
          entryPriceRange: row.entry_price_range,
          positionSizeRange: row.position_size_range,
          holdingPeriodHours: row.holding_period_hours,
          winRate: parseFloat(row.win_rate),
          avgRoi: parseFloat(row.avg_roi),
          marketCategory: row.market_category,
          marketPhase: row.market_phase,
          eliteTradersUsing: row.elite_traders_using,
        }));

        // Calculate pattern matches
        const matchingPatterns: any[] = [];
        let totalMatchScore = 0;
        let totalWeightedRoi = 0;
        let totalWeight = 0;

        for (const pattern of patterns) {
          let matchScore = 0;
          let matchedFeatures: string[] = [];

          // Check entry price match
          if (pattern.entryPriceRange) {
            const { min, max, optimal } = pattern.entryPriceRange;
            if (trade.entryPrice >= min && trade.entryPrice <= max) {
              const deviation = Math.abs(trade.entryPrice - optimal) / optimal;
              const priceScore = Math.max(0, 100 - (deviation * 200));
              matchScore += priceScore;
              matchedFeatures.push('entry_price');
            }
          }

          // Check position size match
          if (pattern.positionSizeRange) {
            const { min, max, avg } = pattern.positionSizeRange;
            if (trade.positionSize >= min && trade.positionSize <= max) {
              const deviation = Math.abs(trade.positionSize - avg) / avg;
              const sizeScore = Math.max(0, 100 - (deviation * 100));
              matchScore += sizeScore;
              matchedFeatures.push('position_size');
            }
          }

          // Check holding period match
          if (trade.holdingHours && pattern.holdingPeriodHours) {
            const { min, max, avg } = pattern.holdingPeriodHours;
            if (trade.holdingHours >= min && trade.holdingHours <= max) {
              const deviation = Math.abs(trade.holdingHours - avg) / avg;
              const periodScore = Math.max(0, 100 - (deviation * 100));
              matchScore += periodScore;
              matchedFeatures.push('holding_period');
            }
          }

          const avgMatchScore = matchedFeatures.length > 0 ? matchScore / matchedFeatures.length : 0;

          if (avgMatchScore >= 50) {
            const weight = (pattern.winRate / 100) * (avgMatchScore / 100);
            totalMatchScore += avgMatchScore * weight;
            totalWeightedRoi += pattern.avgRoi * weight;
            totalWeight += weight;

            matchingPatterns.push({
              pattern: {
                id: pattern.id,
                name: pattern.patternName,
                type: pattern.patternType,
                winRate: pattern.winRate,
                avgRoi: pattern.avgRoi,
              },
              matchScore: Math.round(avgMatchScore * 100) / 100,
              matchedFeatures,
            });
          }
        }

        // Sort matching patterns by combined score
        matchingPatterns.sort((a, b) => {
          const scoreA = (a.pattern.winRate / 100) * (a.matchScore / 100) * 100;
          const scoreB = (b.pattern.winRate / 100) * (b.matchScore / 100) * 100;
          return scoreB - scoreA;
        });

        // Calculate prediction
        const avgConfidence = totalWeight > 0 ? totalMatchScore / totalWeight : 50;
        const predictedRoi = totalWeight > 0 ? totalWeightedRoi / totalWeight : 0;
        const outcome: 'win' | 'loss' = avgConfidence >= 50 ? 'win' : 'loss';
        const confidence = Math.round(Math.abs(avgConfidence - 50) * 2); // Convert to 0-100 scale

        const reasoning: string[] = [];
        if (matchingPatterns.length > 0) {
          const top = matchingPatterns[0];
          reasoning.push(
            `Similar to "${top.pattern.name}" pattern (${top.pattern.winRate.toFixed(1)}% win rate, ${top.matchScore.toFixed(0)}% match)`
          );
          
          if (matchingPatterns.length > 1) {
            reasoning.push(`${matchingPatterns.length} similar patterns found with avg ${avgConfidence.toFixed(1)}% confidence`);
          }
        } else {
          reasoning.push('No strong pattern matches found - prediction based on market averages');
        }

        // Get market sentiment (if available)
        const sentimentResult = await db.execute(sql`
          SELECT *
          FROM market_sentiment
          WHERE market_id = ${trade.marketId}
          ORDER BY measured_at DESC
          LIMIT 1
        `);

        const marketSentiment = sentimentResult.rows.length > 0 ? {
          sentimentScore: parseFloat(sentimentResult.rows[0].sentiment_score as string),
          sentimentLabel: sentimentResult.rows[0].sentiment_label,
          sentimentMomentum: sentimentResult.rows[0].sentiment_momentum,
          measuredAt: sentimentResult.rows[0].measured_at,
        } : undefined;

        if (marketSentiment) {
          reasoning.push(`Market sentiment: ${marketSentiment.sentimentLabel} (${marketSentiment.sentimentScore.toFixed(0)})`);
        }

        // Get order book analysis (if available)
        const orderBookResult = await db.execute(sql`
          SELECT *
          FROM order_book_analysis
          WHERE market_id = ${trade.marketId}
          ORDER BY snapshot_at DESC
          LIMIT 1
        `);

        const orderBookAnalysis = orderBookResult.rows.length > 0 ? {
          orderImbalance: parseFloat(orderBookResult.rows[0].order_imbalance as string),
          imbalanceDirection: orderBookResult.rows[0].imbalance_direction,
          whaleActivity: orderBookResult.rows[0].whale_activity,
          liquidityScore: parseFloat(orderBookResult.rows[0].liquidity_score as string),
          hftScore: parseFloat(orderBookResult.rows[0].hft_score as string),
        } : undefined;

        if (orderBookAnalysis) {
          reasoning.push(`Order imbalance: ${orderBookAnalysis.imbalanceDirection} (${orderBookAnalysis.orderImbalance.toFixed(1)}%)`);
          if (orderBookAnalysis.whaleActivity) {
            reasoning.push('⚠️ Whale activity detected');
          }
        }

        return reply.send({
          prediction: {
            outcome,
            confidence: Math.min(confidence, 95),
            predictedRoi: Math.round(predictedRoi * 100) / 100,
            reasoning,
          },
          matchingPatterns: matchingPatterns.slice(0, 5), // Top 5
          marketSentiment,
          orderBookAnalysis,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to analyze pattern" });
      }
    }
  );

  /**
   * GET /api/patterns/similar
   * Find similar successful patterns
   */
  fastify.get<{
    Querystring: z.infer<typeof PatternAnalysisRequestSchema> & z.infer<typeof SimilarPatternsQuerySchema>;
  }>(
    "/api/patterns/similar",
    {
      schema: {
        querystring: PatternAnalysisRequestSchema.merge(SimilarPatternsQuerySchema),
        response: {
          200: z.object({
            patterns: z.array(z.any()),
            summary: z.object({
              totalPatterns: z.number(),
              avgWinRate: z.number(),
              avgRoi: z.number(),
              topCategory: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { entryPrice, positionSize, marketId, marketCategory, marketPhase, holdingHours, minWinRate, minConfidence, limit } = request.query;

      try {
        // Get market category if not provided
        let category = marketCategory;
        if (!category) {
          const marketResult = await db.execute(sql`
            SELECT category FROM markets WHERE id = ${marketId}
          `);
          if (marketResult.rows.length > 0) {
            category = marketResult.rows[0].category as string;
          }
        }

        // Build query
        let query = sql`
          SELECT 
            tp.*,
            COUNT(pm.id) FILTER (WHERE pm.actual_outcome = 'win') as recent_wins,
            COUNT(pm.id) FILTER (WHERE pm.matched_at > NOW() - INTERVAL '30 days') as recent_matches
          FROM trading_patterns tp
          LEFT JOIN pattern_matches pm ON tp.id = pm.pattern_id
          WHERE tp.win_rate >= ${minWinRate}
            AND tp.confidence_score >= ${minConfidence}
        `;

        if (category) {
          query = sql`${query} AND (tp.market_category = ${category} OR tp.market_category IS NULL)`;
        }

        if (marketPhase) {
          query = sql`${query} AND (tp.market_phase = ${marketPhase} OR tp.market_phase IS NULL)`;
        }

        query = sql`${query}
          GROUP BY tp.id
          ORDER BY tp.win_rate DESC, tp.confidence_score DESC
          LIMIT ${limit}
        `;

        const result = await db.execute(query);
        const rows = Array.isArray(result) ? result : (result as any).rows || [];

        const patterns = rows.map((row: any) => ({
          id: row.id,
          patternType: row.pattern_type,
          patternName: row.pattern_name,
          confidenceScore: parseFloat(row.confidence_score || 0),
          entryPriceRange: row.entry_price_range,
          positionSizeRange: row.position_size_range,
          holdingPeriodHours: row.holding_period_hours,
          winRate: parseFloat(row.win_rate || 0),
          avgRoi: parseFloat(row.avg_roi || 0),
          sharpeRatio: parseFloat(row.sharpe_ratio || 0),
          occurrences: parseInt(row.occurrences || 0),
          marketCategory: row.market_category,
          marketPhase: row.market_phase,
          recentWins: parseInt(row.recent_wins || 0),
          recentMatches: parseInt(row.recent_matches || 0),
        }));

        // Calculate summary
        const summary = {
          totalPatterns: patterns.length,
          avgWinRate: patterns.length > 0
            ? patterns.reduce((sum, p) => sum + p.winRate, 0) / patterns.length
            : 0,
          avgRoi: patterns.length > 0
            ? patterns.reduce((sum, p) => sum + p.avgRoi, 0) / patterns.length
            : 0,
          topCategory: category || 'All',
        };

        return reply.send({
          patterns,
          summary: {
            ...summary,
            avgWinRate: Math.round(summary.avgWinRate * 100) / 100,
            avgRoi: Math.round(summary.avgRoi * 100) / 100,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to find similar patterns" });
      }
    }
  );

  /**
   * GET /api/patterns/correlations
   * Get market correlations
   */
  fastify.get(
    "/api/patterns/correlations",
    {
      schema: {
        querystring: z.object({
          marketId: z.string().uuid().optional(),
          minCorrelation: z.coerce.number().min(0).max(1).optional().default(0.5),
          limit: z.coerce.number().min(1).max(50).optional().default(20),
        }),
        response: {
          200: z.object({
            correlations: z.array(z.any()),
          }),
        },
      },
    },
    async (request, reply) => {
      const { marketId, minCorrelation, limit } = request.query as any;

      try {
        let query = sql`
          SELECT 
            mc.*,
            ma.question as market_a_question,
            ma.category as market_a_category,
            mb.question as market_b_question,
            mb.category as market_b_category
          FROM market_correlations mc
          JOIN markets ma ON mc.market_a_id = ma.id
          JOIN markets mb ON mc.market_b_id = mb.id
          WHERE mc.is_significant = true
            AND ABS(mc.correlation_coefficient) >= ${minCorrelation}
        `;

        if (marketId) {
          query = sql`${query} AND (mc.market_a_id = ${marketId} OR mc.market_b_id = ${marketId})`;
        }

        query = sql`${query}
          ORDER BY ABS(mc.correlation_coefficient) DESC
          LIMIT ${limit}
        `;

        const result = await db.execute(query);
        const correlationRows = Array.isArray(result) ? result : (result as any).rows || [];

        const correlations = correlationRows.map((row: any) => ({
          id: row.id,
          marketA: {
            id: row.market_a_id,
            question: row.market_a_question,
            category: row.market_a_category,
          },
          marketB: {
            id: row.market_b_id,
            question: row.market_b_question,
            category: row.market_b_category,
          },
          correlationCoefficient: parseFloat(row.correlation_coefficient || 0),
          correlationStrength: row.correlation_strength,
          optimalLagHours: row.optimal_lag_hours,
          lagCorrelation: row.lag_correlation ? parseFloat(row.lag_correlation) : null,
          sampleSize: parseInt(row.sample_size || 0),
          pValue: parseFloat(row.p_value || 0),
          isSignificant: row.is_significant,
        }));

        return reply.send({ correlations });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch correlations" });
      }
    }
  );

  /**
   * GET /api/patterns/trader-clusters
   * Get trader behavior clusters
   */
  fastify.get(
    "/api/patterns/trader-clusters",
    {
      schema: {
        response: {
          200: z.object({
            clusters: z.array(z.any()),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await db.execute(sql`
          SELECT 
            tbc.*,
            COUNT(tca.trader_address) as actual_trader_count,
            AVG(tca.elite_score) as avg_member_elite_score
          FROM trader_behavior_clusters tbc
          LEFT JOIN trader_cluster_assignments tca ON tbc.id = tca.cluster_id
          GROUP BY tbc.id
          ORDER BY tbc.cluster_win_rate DESC
        `);
        const clusterRows = Array.isArray(result) ? result : (result as any).rows || [];

        const clusters = clusterRows.map((row: any) => ({
          id: row.id,
          clusterName: row.cluster_name,
          clusterType: row.cluster_type,
          avgPositionSize: parseFloat(row.avg_position_size || 0),
          avgHoldingHours: parseFloat(row.avg_holding_hours || 0),
          avgWinRate: parseFloat(row.avg_win_rate || 0),
          avgRoi: parseFloat(row.avg_roi || 0),
          entryPattern: row.entry_pattern,
          exitPattern: row.exit_pattern,
          riskProfile: row.risk_profile,
          traderCount: parseInt(row.actual_trader_count || row.trader_count || 0),
          eliteTraderPercentage: parseFloat(row.elite_trader_percentage || 0),
          clusterWinRate: parseFloat(row.cluster_win_rate || 0),
          clusterAvgRoi: parseFloat(row.cluster_avg_roi || 0),
          clusterSharpeRatio: parseFloat(row.cluster_sharpe_ratio || 0),
          avgMemberEliteScore: row.avg_member_elite_score ? parseFloat(row.avg_member_elite_score) : null,
        }));

        return reply.send({ clusters });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch trader clusters" });
      }
    }
  );
}
