"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface RiskMetrics {
  portfolioValue: number;
  totalExposure: number;
  availableCapital: number;
  riskPercentage: number;
  valueAtRisk: number; // VaR 95%
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  volatility: number;
}

interface PositionRisk {
  marketId: string;
  marketQuestion: string;
  exposure: number;
  riskScore: number; // 0-100
  kellyOptimal: number;
  currentSize: number;
  recommendedSize: number;
  correlations: string[]; // IDs of correlated markets
}

interface RiskAlert {
  id: string;
  type: "overexposed" | "correlated" | "volatility" | "drawdown";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendation: string;
}

export default function RiskDashboardPage() {
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M">("1W");

  // Fetch risk metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<RiskMetrics>({
    queryKey: ["risk-metrics", timeframe],
    queryFn: async () => {
      // TODO: Connect to real API
      // const response = await fetch(`${API_URL}/api/risk/metrics?timeframe=${timeframe}`);
      // return response.json();

      // Mock data
      return {
        portfolioValue: 12547.23,
        totalExposure: 8350.0,
        availableCapital: 4197.23,
        riskPercentage: 66.5,
        valueAtRisk: 1256.0,
        sharpeRatio: 1.82,
        maxDrawdown: -12.4,
        beta: 1.15,
        volatility: 18.5,
      };
    },
    staleTime: 30000,
  });

  // Fetch position risks
  const { data: positions, isLoading: positionsLoading } = useQuery<PositionRisk[]>({
    queryKey: ["position-risks"],
    queryFn: async () => {
      // TODO: Connect to real API
      // const response = await fetch(`${API_URL}/api/risk/positions`);
      // return response.json();

      // Mock data
      return [
        {
          marketId: "1",
          marketQuestion: "Will Bitcoin hit $100K by end of 2026?",
          exposure: 2500,
          riskScore: 75,
          kellyOptimal: 0.15,
          currentSize: 0.20,
          recommendedSize: 0.15,
          correlations: ["2", "5"],
        },
        {
          marketId: "2",
          marketQuestion: "Will Ethereum reach $5K in 2026?",
          exposure: 1800,
          riskScore: 68,
          kellyOptimal: 0.12,
          currentSize: 0.14,
          recommendedSize: 0.12,
          correlations: ["1"],
        },
        {
          marketId: "3",
          marketQuestion: "Will Fed cut rates in Q1 2026?",
          exposure: 3200,
          riskScore: 85,
          kellyOptimal: 0.08,
          currentSize: 0.25,
          recommendedSize: 0.10,
          correlations: [],
        },
      ];
    },
    staleTime: 30000,
  });

  // Fetch risk alerts
  const { data: alerts } = useQuery<RiskAlert[]>({
    queryKey: ["risk-alerts"],
    queryFn: async () => {
      // Mock data
      return [
        {
          id: "1",
          type: "overexposed",
          severity: "high",
          message: "Portfolio exposure exceeds 65% of capital",
          recommendation: "Consider reducing position sizes or taking profits",
        },
        {
          id: "2",
          type: "correlated",
          severity: "medium",
          message: "High correlation detected between crypto markets",
          recommendation: "Diversify into uncorrelated categories",
        },
        {
          id: "3",
          type: "volatility",
          severity: "low",
          message: "Market volatility increased 15% this week",
          recommendation: "Review stop losses and position limits",
        },
      ];
    },
    staleTime: 30000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500" };
    if (score >= 60) return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500" };
    if (score >= 40) return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500" };
    return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500" };
  };

  const getSeverityColor = (severity: RiskAlert["severity"]) => {
    switch (severity) {
      case "critical": return { bg: "bg-red-600", text: "text-white", icon: "🚨" };
      case "high": return { bg: "bg-orange-600", text: "text-white", icon: "⚠️" };
      case "medium": return { bg: "bg-amber-600", text: "text-white", icon: "⚡" };
      case "low": return { bg: "bg-blue-600", text: "text-white", icon: "ℹ️" };
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0f14] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              Risk <span className="text-teal-400">Management</span>
            </h1>
            <Link
              href="/home"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              ← Back
            </Link>
          </div>
          <p className="text-gray-400">
            Professional risk management tools to protect your capital
          </p>
        </div>

        {/* Risk Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.map((alert) => {
              const severity = getSeverityColor(alert.severity);
              return (
                <div
                  key={alert.id}
                  className={`${severity.bg} border border-opacity-50 rounded-xl p-4 flex items-start gap-4`}
                >
                  <span className="text-2xl">{severity.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold ${severity.text}`}>{alert.message}</h3>
                    </div>
                    <p className="text-white/80 text-sm">{alert.recommendation}</p>
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Timeframe Selector */}
        <div className="flex gap-2 mb-6">
          {(["1D", "1W", "1M"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeframe === tf
                  ? "bg-teal-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Risk Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Portfolio Risk */}
          <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-6">
            <div className="text-white/80 text-sm mb-2">Portfolio Risk</div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics?.riskPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-white/70">
              {formatCurrency(metrics?.totalExposure || 0)} exposed
            </div>
          </div>

          {/* Value at Risk */}
          <div className="bg-[#1a2332] border border-red-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Value at Risk (95%)</div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(metrics?.valueAtRisk || 0)}
            </div>
            <div className="text-sm text-gray-500">Max potential loss</div>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-[#1a2332] border border-teal-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Sharpe Ratio</div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics?.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Risk-adjusted return</div>
          </div>

          {/* Max Drawdown */}
          <div className="bg-[#1a2332] border border-amber-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Max Drawdown</div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics?.maxDrawdown.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Peak to trough</div>
          </div>
        </div>

        {/* Capital Allocation Chart */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Capital Allocation</h2>
          <div className="space-y-4">
            {/* Exposed Capital */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Exposed Capital</span>
                <span className="text-white font-bold">
                  {formatCurrency(metrics?.totalExposure || 0)} (
                  {metrics?.riskPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (metrics?.riskPercentage || 0) > 70
                      ? "bg-gradient-to-r from-red-500 to-red-400"
                      : (metrics?.riskPercentage || 0) > 50
                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : "bg-gradient-to-r from-green-500 to-green-400"
                  }`}
                  style={{ width: `${metrics?.riskPercentage || 0}%` }}
                />
              </div>
            </div>

            {/* Available Capital */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Available Capital</span>
                <span className="text-white font-bold">
                  {formatCurrency(metrics?.availableCapital || 0)} (
                  {(100 - (metrics?.riskPercentage || 0)).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full transition-all"
                  style={{ width: `${100 - (metrics?.riskPercentage || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Position Risk Analysis */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Position Risk Analysis</h2>
          
          {positionsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400 mx-auto"></div>
            </div>
          ) : positions && positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((position) => {
                const riskColor = getRiskColor(position.riskScore);
                const isOverexposed = position.currentSize > position.kellyOptimal * 1.5;

                return (
                  <div
                    key={position.marketId}
                    className={`bg-gray-900/50 border rounded-xl p-4 ${
                      isOverexposed ? "border-red-500/50" : "border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link
                          href={`/markets/${position.marketId}`}
                          className="text-white font-medium hover:text-teal-400 transition-colors"
                        >
                          {position.marketQuestion}
                        </Link>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-gray-500 text-sm">
                            Exposure: {formatCurrency(position.exposure)}
                          </span>
                          {position.correlations.length > 0 && (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                              {position.correlations.length} correlated
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-3 py-1 ${riskColor.bg} ${riskColor.text} rounded-full text-sm font-bold mb-1`}
                        >
                          Risk: {position.riskScore}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Kelly Criterion */}
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Kelly Optimal</div>
                        <div className="text-white font-bold">
                          {(position.kellyOptimal * 100).toFixed(1)}%
                        </div>
                      </div>

                      {/* Current Size */}
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Current Size</div>
                        <div
                          className={`font-bold ${
                            isOverexposed ? "text-red-400" : "text-white"
                          }`}
                        >
                          {(position.currentSize * 100).toFixed(1)}%
                          {isOverexposed && " ⚠️"}
                        </div>
                      </div>

                      {/* Recommended Action */}
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Recommendation</div>
                        <div className="text-white font-bold">
                          {position.currentSize > position.recommendedSize ? (
                            <span className="text-red-400">Reduce to {(position.recommendedSize * 100).toFixed(1)}%</span>
                          ) : position.currentSize < position.recommendedSize ? (
                            <span className="text-green-400">Can increase</span>
                          ) : (
                            <span className="text-teal-400">Optimal ✓</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Risk Bar */}
                    <div className="mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16">Risk</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              position.riskScore >= 80
                                ? "bg-red-500"
                                : position.riskScore >= 60
                                ? "bg-amber-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${position.riskScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">
                          {position.riskScore}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No active positions</div>
          )}
        </div>

        {/* Risk Management Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Kelly Calculator */}
          <div className="bg-[#1a2332] border border-teal-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">🎯 Kelly Calculator</h3>
            <p className="text-gray-400 text-sm mb-4">
              Calculate optimal bet size based on win probability and odds
            </p>
            <button className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium">
              Open Calculator
            </button>
          </div>

          {/* Correlation Matrix */}
          <div className="bg-[#1a2332] border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">📊 Correlation Matrix</h3>
            <p className="text-gray-400 text-sm mb-4">
              See how your positions correlate to manage diversification
            </p>
            <button className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium">
              View Matrix
            </button>
          </div>
        </div>

        {/* Premium Upgrade Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">
                Unlock Advanced Risk Tools 🛡️
              </h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>✨ Real-time correlation matrix</li>
                <li>✨ Monte Carlo risk simulations</li>
                <li>✨ Automated stop-loss suggestions</li>
                <li>✨ Portfolio stress testing</li>
              </ul>
            </div>
            <button className="px-6 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
