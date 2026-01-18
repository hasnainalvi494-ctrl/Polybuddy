"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PortfolioOverview {
  totalValue: number;
  totalInvested: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  roi: number;
}

interface RiskMetrics {
  currentDrawdown: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  winLossRatio: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
}

interface Diversification {
  positionCount: number;
  largestPosition: number;
  largestPositionPercent: number;
  categoryDistribution: Record<string, number>;
  concentrationRisk: 'low' | 'medium' | 'high';
}

export default function RiskDashboard() {
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [diversification, setDiversification] = useState<Diversification | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://polybuddy-api-production.up.railway.app/api/portfolio/risk');
      const data = await response.json();
      
      setOverview(data.overview);
      setRiskMetrics(data.riskMetrics);
      setDiversification(data.diversification);
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Failed to fetch risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    return risk === 'low' ? 'text-green-600 dark:text-green-400' :
           risk === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
           'text-red-600 dark:text-red-400';
  };

  const getRiskBgColor = (risk: string) => {
    return risk === 'low' ? 'bg-green-100 dark:bg-green-900/20' :
           risk === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
           'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Risk Management Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Comprehensive portfolio analysis with risk metrics and recommendations
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Portfolio Value</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              ${overview?.totalValue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Invested: ${overview?.totalInvested.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total P&L</div>
            <div className={`text-3xl font-bold ${
              (overview?.totalPnL || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {(overview?.totalPnL || 0) >= 0 ? '+' : ''}${overview?.totalPnL.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              ROI: {(overview?.roi || 0) >= 0 ? '+' : ''}{overview?.roi.toFixed(2)}%
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Unrealized P&L</div>
            <div className={`text-3xl font-bold ${
              (overview?.unrealizedPnL || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
            }`}>
              {(overview?.unrealizedPnL || 0) >= 0 ? '+' : ''}${overview?.unrealizedPnL.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Realized: ${overview?.realizedPnL.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Risk Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Risk Metrics
            </h2>

            <div className="space-y-4">
              {/* Drawdown */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Drawdown</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {riskMetrics?.currentDrawdown.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${Math.min((riskMetrics?.currentDrawdown || 0) / 20 * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max Drawdown: {riskMetrics?.maxDrawdown.toFixed(2)}%
                </div>
              </div>

              {/* Sharpe Ratio */}
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</span>
                <span className={`text-lg font-bold ${
                  (riskMetrics?.sharpeRatio || 0) >= 1.5 ? 'text-green-600 dark:text-green-400' :
                  (riskMetrics?.sharpeRatio || 0) >= 1.0 ? 'text-blue-600 dark:text-blue-400' :
                  'text-orange-600 dark:text-orange-400'
                }`}>
                  {riskMetrics?.sharpeRatio.toFixed(2)}
                </span>
              </div>

              {/* Win Rate */}
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {riskMetrics?.winRate.toFixed(1)}%
                </span>
              </div>

              {/* Win/Loss Ratio */}
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Win/Loss Ratio</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {riskMetrics?.winLossRatio.toFixed(2)}:1
                </span>
              </div>

              {/* Profit Factor */}
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Profit Factor</span>
                <span className={`text-lg font-bold ${
                  (riskMetrics?.profitFactor || 0) >= 2.0 ? 'text-green-600 dark:text-green-400' :
                  (riskMetrics?.profitFactor || 0) >= 1.5 ? 'text-blue-600 dark:text-blue-400' :
                  'text-orange-600 dark:text-orange-400'
                }`}>
                  {riskMetrics?.profitFactor.toFixed(2)}x
                </span>
              </div>

              {/* Average Win/Loss */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Win</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    +${riskMetrics?.averageWin.toFixed(0)}
                  </div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Loss</div>
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    -${riskMetrics?.averageLoss.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diversification */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Portfolio Diversification
            </h2>

            <div className="space-y-4">
              {/* Concentration Risk */}
              <div className={`p-4 rounded-lg ${getRiskBgColor(diversification?.concentrationRisk || 'low')}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">Concentration Risk</span>
                  <span className={`text-lg font-bold uppercase ${getRiskColor(diversification?.concentrationRisk || 'low')}`}>
                    {diversification?.concentrationRisk}
                  </span>
                </div>
              </div>

              {/* Position Count */}
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Positions</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {diversification?.positionCount}
                </span>
              </div>

              {/* Largest Position */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Largest Position</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {diversification?.largestPositionPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(diversification?.largestPositionPercent || 0, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ${diversification?.largestPosition.toLocaleString()}
                </div>
              </div>

              {/* Category Distribution */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Category Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(diversification?.categoryDistribution || {}).map(([category, percent]) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{category}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Risk Management Recommendations
          </h2>
          
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.includes('✅') ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
                  rec.includes('⚠️') || rec.includes('🔴') ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                }`}
              >
                <p className="text-sm text-gray-800 dark:text-gray-200">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/calculator"
            className="p-6 bg-blue-600 hover:bg-blue-700 rounded-xl text-center transition-colors"
          >
            <div className="text-4xl mb-2">📊</div>
            <div className="text-white font-semibold">Position Calculator</div>
            <div className="text-blue-100 text-sm mt-1">Calculate optimal position sizes</div>
          </Link>

          <Link
            href="/best-bets"
            className="p-6 bg-green-600 hover:bg-green-700 rounded-xl text-center transition-colors"
          >
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-white font-semibold">Best Bets</div>
            <div className="text-green-100 text-sm mt-1">View elite trader signals</div>
          </Link>

          <button
            onClick={fetchRiskData}
            className="p-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-center transition-colors"
          >
            <div className="text-4xl mb-2">🔄</div>
            <div className="text-white font-semibold">Refresh Data</div>
            <div className="text-purple-100 text-sm mt-1">Update portfolio metrics</div>
          </button>
        </div>
      </div>
    </div>
  );
}
