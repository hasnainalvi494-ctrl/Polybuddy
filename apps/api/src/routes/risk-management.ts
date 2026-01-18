/**
 * Risk Management & Portfolio Analytics API
 * 
 * Comprehensive risk management with drawdown protection, diversification,
 * stop-loss automation, and real-time P&L tracking.
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
  type PositionSize 
} from "@polybuddy/analytics";

// ============================================================================
// SCHEMAS
// ============================================================================

const PositionCalculatorSchema = z.object({
  bankroll: z.number().positive(),
  marketPrice: z.number().min(0.01).max(0.99),
  expectedProbability: z.number().min(0).max(1),
  riskTolerance: z.enum(['aggressive', 'moderate', 'conservative']),
  maxPositionSize: z.number().positive().optional(),
  currentExposure: z.number().min(0).optional(),
});

const StopLossRequestSchema = z.object({
  entryPrice: z.number().positive(),
  positionSize: z.number().positive(),
  positionType: z.enum(['long', 'short']),
  riskPercentage: z.number().min(1).max(50).default(15),
  volatility: z.number().min(0).optional(),
});

const PortfolioPositionSchema = z.object({
  marketId: z.string(),
  outcome: z.enum(['yes', 'no']),
  entryPrice: z.number(),
  currentPrice: z.number(),
  shares: z.number(),
  unrealizedPnL: z.number(),
  realizedPnL: z.number().optional(),
});

// ============================================================================
// RISK MANAGEMENT ENDPOINTS
// ============================================================================

export async function riskManagementRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ==========================================================================
  // POST /api/positions/calculate
  // Position Size Calculator with Risk Management
  // ==========================================================================
  typedApp.post(
    "/api/positions/calculate",
    {
      schema: {
        body: PositionCalculatorSchema,
        response: {
          200: z.object({
            position: z.object({
              // Position sizing
              positionAmount: z.number(),
              positionShares: z.number(),
              riskPercentage: z.number(),
              kellyPercentage: z.number(),
              fractionalKelly: z.number(),
              
              // Risk management
              stopLoss: z.number(),
              takeProfit: z.number(),
              maxLoss: z.number(),
              maxGain: z.number(),
              expectedValue: z.number(),
              
              // Risk metrics
              riskRewardRatio: z.number(),
              probabilityOfRuin: z.number(),
              sharpeRatio: z.number(),
              
              // Recommendations
              recommendation: z.enum(['aggressive', 'moderate', 'conservative', 'skip']),
              warnings: z.array(z.string()),
              
              // Drawdown protection
              maxDrawdownRisk: z.number(),
              portfolioImpact: z.number(),
              diversificationScore: z.number(),
            }),
            analysis: z.object({
              edgeAnalysis: z.string(),
              riskAssessment: z.string(),
              positioningAdvice: z.string(),
              diversificationAdvice: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { 
        bankroll, 
        marketPrice, 
        expectedProbability, 
        riskTolerance,
        maxPositionSize,
        currentExposure = 0
      } = request.body;
      
      try {
        // Calculate edge
        const edge = expectedProbability - marketPrice;
        
        // Calculate position using Kelly Criterion
        const position = calculateAdvancedKelly({
          bankroll,
          odds: marketPrice,
          edge,
          winProbability: expectedProbability,
          riskTolerance,
          maxPositionSize,
          currentExposure,
        });
        
        // Calculate risk levels
        const riskLevels = calculateRiskLevels(
          marketPrice,
          position.positionAmount,
          0.30, // 30% target return
          0.15  // 15% max risk
        );
        
        // Drawdown protection
        const availableBankroll = bankroll - currentExposure;
        const maxDrawdownRisk = (position.maxLoss / bankroll) * 100;
        const portfolioImpact = (position.positionAmount / bankroll) * 100;
        
        // Diversification score (0-100)
        // Lower is better diversification (more positions)
        const diversificationScore = portfolioImpact > 20 ? 30 : 
                                     portfolioImpact > 10 ? 60 :
                                     portfolioImpact > 5 ? 80 : 100;
        
        // Generate analysis
        const edgeAnalysis = edge > 0.15 ? "Strong edge detected (>15%)" :
                            edge > 0.08 ? "Moderate edge detected (8-15%)" :
                            edge > 0.03 ? "Small edge detected (3-8%)" :
                            edge > 0 ? "Marginal edge detected (<3%)" :
                            "No edge detected - avoid this bet";
        
        const riskAssessment = maxDrawdownRisk < 2 ? "Low risk (< 2% max drawdown)" :
                              maxDrawdownRisk < 5 ? "Moderate risk (2-5% max drawdown)" :
                              maxDrawdownRisk < 10 ? "High risk (5-10% max drawdown)" :
                              "Very high risk (> 10% max drawdown)";
        
        const positioningAdvice = position.recommendation === 'aggressive' 
          ? "Strong signal - consider full position" :
          position.recommendation === 'moderate'
          ? "Good signal - moderate position recommended" :
          position.recommendation === 'conservative'
          ? "Weak signal - small position or skip" :
          "Skip this trade - insufficient edge or high risk";
        
        const diversificationAdvice = diversificationScore >= 80 
          ? "Excellent diversification - position is well-sized" :
          diversificationScore >= 60
          ? "Good diversification - acceptable position size" :
          diversificationScore >= 30
          ? "Poor diversification - position may be too large" :
          "WARNING: Over-concentrated position - reduce size";

        return {
          position: {
            positionAmount: position.positionAmount,
            positionShares: position.positionShares,
            riskPercentage: position.riskPercentage,
            kellyPercentage: position.kellyPercentage,
            fractionalKelly: position.fractionalKelly,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            maxLoss: position.maxLoss,
            maxGain: riskLevels.maxGain,
            expectedValue: position.expectedValue,
            riskRewardRatio: position.riskRewardRatio,
            probabilityOfRuin: position.probabilityOfRuin,
            sharpeRatio: position.sharpeRatio,
            recommendation: position.recommendation,
            warnings: position.warnings,
            maxDrawdownRisk: Math.round(maxDrawdownRisk * 100) / 100,
            portfolioImpact: Math.round(portfolioImpact * 100) / 100,
            diversificationScore,
          },
          analysis: {
            edgeAnalysis,
            riskAssessment,
            positioningAdvice,
            diversificationAdvice,
          },
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to calculate position" });
      }
    }
  );

  // ==========================================================================
  // POST /api/positions/stop-loss
  // Stop Loss Automation Suggestions
  // ==========================================================================
  typedApp.post(
    "/api/positions/stop-loss",
    {
      schema: {
        body: StopLossRequestSchema,
        response: {
          200: z.object({
            suggestions: z.array(z.object({
              type: z.string(),
              stopLoss: z.number(),
              description: z.string(),
              riskAmount: z.number(),
              riskPercentage: z.number(),
            })),
            recommended: z.object({
              stopLoss: z.number(),
              reason: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { entryPrice, positionSize, positionType, riskPercentage, volatility } = request.body;
      
      try {
        const suggestions = [];
        
        // 1. Fixed percentage stop loss
        const fixedStopLoss = positionType === 'long' 
          ? entryPrice * (1 - riskPercentage / 100)
          : entryPrice * (1 + riskPercentage / 100);
        
        const fixedRiskAmount = positionSize * (riskPercentage / 100);
        
        suggestions.push({
          type: "Fixed Percentage",
          stopLoss: Math.round(fixedStopLoss * 1000) / 1000,
          description: `${riskPercentage}% stop loss from entry`,
          riskAmount: Math.round(fixedRiskAmount * 100) / 100,
          riskPercentage,
        });
        
        // 2. Conservative stop loss (10%)
        const conservativeStopLoss = positionType === 'long'
          ? entryPrice * 0.90
          : entryPrice * 1.10;
        
        const conservativeRisk = positionSize * 0.10;
        
        suggestions.push({
          type: "Conservative",
          stopLoss: Math.round(conservativeStopLoss * 1000) / 1000,
          description: "10% stop loss - lower risk",
          riskAmount: Math.round(conservativeRisk * 100) / 100,
          riskPercentage: 10,
        });
        
        // 3. Aggressive stop loss (20%)
        const aggressiveStopLoss = positionType === 'long'
          ? entryPrice * 0.80
          : entryPrice * 1.20;
        
        const aggressiveRisk = positionSize * 0.20;
        
        suggestions.push({
          type: "Aggressive",
          stopLoss: Math.round(aggressiveStopLoss * 1000) / 1000,
          description: "20% stop loss - more room for volatility",
          riskAmount: Math.round(aggressiveRisk * 100) / 100,
          riskPercentage: 20,
        });
        
        // 4. Volatility-based stop loss (if volatility provided)
        if (volatility) {
          const volatilityMultiplier = 2.0; // 2x ATR standard
          const volatilityStopLoss = positionType === 'long'
            ? entryPrice * (1 - volatility * volatilityMultiplier)
            : entryPrice * (1 + volatility * volatilityMultiplier);
          
          const volatilityRisk = Math.abs(entryPrice - volatilityStopLoss) / entryPrice * positionSize;
          const volatilityRiskPercent = (volatilityRisk / positionSize) * 100;
          
          suggestions.push({
            type: "Volatility-Based",
            stopLoss: Math.round(volatilityStopLoss * 1000) / 1000,
            description: `2x ATR (${(volatility * 100).toFixed(1)}%) stop loss`,
            riskAmount: Math.round(volatilityRisk * 100) / 100,
            riskPercentage: Math.round(volatilityRiskPercent * 100) / 100,
          });
        }
        
        // Determine recommended stop loss
        let recommended;
        if (volatility && volatility > 0.15) {
          // High volatility - use aggressive stop
          recommended = suggestions.find(s => s.type === "Aggressive") || suggestions[0];
        } else if (riskPercentage <= 10) {
          // User wants conservative risk
          recommended = suggestions.find(s => s.type === "Conservative") || suggestions[0];
        } else {
          // Default to fixed percentage
          recommended = suggestions[0];
        }
        
        return {
          suggestions,
          recommended: {
            stopLoss: recommended.stopLoss,
            reason: `${recommended.type}: ${recommended.description}`,
          },
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to calculate stop loss" });
      }
    }
  );

  // ==========================================================================
  // GET /api/portfolio/risk
  // Portfolio Risk Analysis
  // ==========================================================================
  typedApp.get(
    "/api/portfolio/risk",
    {
      schema: {
        querystring: z.object({
          userAddress: z.string().optional(),
        }),
        response: {
          200: z.object({
            overview: z.object({
              totalValue: z.number(),
              totalInvested: z.number(),
              unrealizedPnL: z.number(),
              realizedPnL: z.number(),
              totalPnL: z.number(),
              roi: z.number(),
            }),
            riskMetrics: z.object({
              currentDrawdown: z.number(),
              maxDrawdown: z.number(),
              sharpeRatio: z.number(),
              winRate: z.number(),
              winLossRatio: z.number(),
              averageWin: z.number(),
              averageLoss: z.number(),
              profitFactor: z.number(),
            }),
            diversification: z.object({
              positionCount: z.number(),
              largestPosition: z.number(),
              largestPositionPercent: z.number(),
              categoryDistribution: z.record(z.string(), z.number()),
              concentrationRisk: z.enum(['low', 'medium', 'high']),
            }),
            recommendations: z.array(z.string()),
          }),
        },
      },
    },
    async (request, reply) => {
      const { userAddress } = request.query;
      
      try {
        // Mock portfolio data (would come from real user data)
        const mockPositions = [
          { invested: 5000, currentValue: 6200, category: 'Politics', pnl: 1200 },
          { invested: 3000, currentValue: 2800, category: 'Sports', pnl: -200 },
          { invested: 4000, currentValue: 4500, category: 'Crypto', pnl: 500 },
          { invested: 2000, currentValue: 2100, category: 'Business', pnl: 100 },
        ];
        
        const totalInvested = mockPositions.reduce((sum, p) => sum + p.invested, 0);
        const totalValue = mockPositions.reduce((sum, p) => sum + p.currentValue, 0);
        const unrealizedPnL = totalValue - totalInvested;
        const realizedPnL = 800; // Mock realized P&L
        const totalPnL = unrealizedPnL + realizedPnL;
        const roi = (totalPnL / totalInvested) * 100;
        
        // Calculate drawdown
        const peakValue = 16000; // Mock peak
        const currentDrawdown = ((peakValue - totalValue) / peakValue) * 100;
        const maxDrawdown = 12.5; // Mock max drawdown
        
        // Win/loss metrics
        const wins = mockPositions.filter(p => p.pnl > 0);
        const losses = mockPositions.filter(p => p.pnl < 0);
        const winRate = (wins.length / mockPositions.length) * 100;
        const averageWin = wins.reduce((sum, p) => sum + p.pnl, 0) / wins.length;
        const averageLoss = Math.abs(losses.reduce((sum, p) => sum + p.pnl, 0) / losses.length);
        const winLossRatio = averageWin / averageLoss;
        
        // Profit factor
        const grossProfit = wins.reduce((sum, p) => sum + p.pnl, 0);
        const grossLoss = Math.abs(losses.reduce((sum, p) => sum + p.pnl, 0));
        const profitFactor = grossProfit / grossLoss;
        
        // Sharpe ratio (simplified)
        const returns = [5.2, -2.1, 3.8, 1.5, 4.2, -1.8, 6.3]; // Mock returns
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = avgReturn / stdDev;
        
        // Diversification
        const largestPosition = Math.max(...mockPositions.map(p => p.currentValue));
        const largestPositionPercent = (largestPosition / totalValue) * 100;
        
        const categoryDistribution: Record<string, number> = {};
        mockPositions.forEach(p => {
          const percent = (p.currentValue / totalValue) * 100;
          categoryDistribution[p.category] = Math.round(percent * 100) / 100;
        });
        
        const concentrationRisk = largestPositionPercent > 40 ? 'high' as const :
                                 largestPositionPercent > 25 ? 'medium' as const :
                                 'low' as const;
        
        // Generate recommendations
        const recommendations: string[] = [];
        
        if (currentDrawdown > 10) {
          recommendations.push("⚠️ Portfolio is down >10% from peak - consider risk reduction");
        }
        if (largestPositionPercent > 30) {
          recommendations.push("⚠️ Largest position >30% of portfolio - diversify");
        }
        if (winRate < 50) {
          recommendations.push("📊 Win rate <50% - review strategy or position sizing");
        }
        if (sharpeRatio < 1.0) {
          recommendations.push("📉 Low Sharpe ratio - risk-adjusted returns need improvement");
        }
        if (profitFactor < 1.5) {
          recommendations.push("⚠️ Profit factor <1.5 - average wins need to increase");
        }
        if (recommendations.length === 0) {
          recommendations.push("✅ Portfolio is well-managed - maintain current strategy");
        }

        return {
          overview: {
            totalValue: Math.round(totalValue * 100) / 100,
            totalInvested: Math.round(totalInvested * 100) / 100,
            unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
            realizedPnL: Math.round(realizedPnL * 100) / 100,
            totalPnL: Math.round(totalPnL * 100) / 100,
            roi: Math.round(roi * 100) / 100,
          },
          riskMetrics: {
            currentDrawdown: Math.round(currentDrawdown * 100) / 100,
            maxDrawdown: Math.round(maxDrawdown * 100) / 100,
            sharpeRatio: Math.round(sharpeRatio * 100) / 100,
            winRate: Math.round(winRate * 100) / 100,
            winLossRatio: Math.round(winLossRatio * 100) / 100,
            averageWin: Math.round(averageWin * 100) / 100,
            averageLoss: Math.round(averageLoss * 100) / 100,
            profitFactor: Math.round(profitFactor * 100) / 100,
          },
          diversification: {
            positionCount: mockPositions.length,
            largestPosition: Math.round(largestPosition * 100) / 100,
            largestPositionPercent: Math.round(largestPositionPercent * 100) / 100,
            categoryDistribution,
            concentrationRisk,
          },
          recommendations,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to analyze portfolio risk" });
      }
    }
  );
}
