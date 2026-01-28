"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface ScanResult {
  id: string;
  type: "arbitrage" | "momentum" | "anomaly" | "pattern" | "sentiment";
  marketId: string;
  marketQuestion: string;
  confidence: number;
  opportunity: string;
  description: string;
  action: "buy_yes" | "buy_no" | "wait" | "exit";
  estimatedEdge: number; // percentage edge
  risk: "low" | "medium" | "high";
  detectedAt: string;
  indicators: {
    name: string;
    value: string;
    signal: "bullish" | "bearish" | "neutral";
  }[];
}

interface ScanStats {
  totalScanned: number;
  opportunitiesFound: number;
  avgConfidence: number;
  lastScanTime: string;
}

export default function AIMarketScannerPage() {
  const [scanType, setScanType] = useState<"all" | ScanResult["type"]>("all");
  const [minConfidence, setMinConfidence] = useState(70);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch scan results
  const { data: results, isLoading, refetch } = useQuery<ScanResult[]>({
    queryKey: ["ai-scan-results", scanType, minConfidence],
    queryFn: async () => {
      // TODO: Connect to real API
      // const response = await fetch(`${API_URL}/api/ai-scanner?type=${scanType}&minConfidence=${minConfidence}`);
      // return response.json();

      // Mock data
      return [
        {
          id: "1",
          type: "arbitrage",
          marketId: "market-1",
          marketQuestion: "Will Bitcoin hit $100K by end of 2026?",
          confidence: 87,
          opportunity: "Cross-platform arbitrage opportunity",
          description: "Price discrepancy detected between Polymarket and Manifold Markets",
          action: "buy_yes",
          estimatedEdge: 5.2,
          risk: "low",
          detectedAt: "2026-01-26T14:30:00Z",
          indicators: [
            { name: "Price Diff", value: "5.2%", signal: "bullish" },
            { name: "Volume", value: "High", signal: "bullish" },
            { name: "Liquidity", value: "$450K", signal: "neutral" },
          ],
        },
        {
          id: "2",
          type: "momentum",
          marketId: "market-2",
          marketQuestion: "Will Fed cut rates in Q1 2026?",
          confidence: 92,
          opportunity: "Strong momentum breakout",
          description: "Price surged 15% in last 4 hours with increasing volume",
          action: "buy_yes",
          estimatedEdge: 8.5,
          risk: "medium",
          detectedAt: "2026-01-26T14:15:00Z",
          indicators: [
            { name: "Momentum", value: "+15%", signal: "bullish" },
            { name: "Volume Trend", value: "↑ 220%", signal: "bullish" },
            { name: "Whale Activity", value: "3 large bets", signal: "bullish" },
          ],
        },
        {
          id: "3",
          type: "anomaly",
          marketId: "market-3",
          marketQuestion: "Will Trump win 2026 midterms?",
          confidence: 78,
          opportunity: "Unusual whale accumulation",
          description: "5 whale wallets accumulated $200K+ in last hour",
          action: "buy_no",
          estimatedEdge: 3.8,
          risk: "high",
          detectedAt: "2026-01-26T14:00:00Z",
          indicators: [
            { name: "Whale Bets", value: "5 wallets", signal: "bearish" },
            { name: "Total Size", value: "$200K+", signal: "bearish" },
            { name: "Time Window", value: "< 1 hour", signal: "bearish" },
          ],
        },
        {
          id: "4",
          type: "pattern",
          marketId: "market-4",
          marketQuestion: "Will Ethereum reach $5K in 2026?",
          confidence: 83,
          opportunity: "Breakout pattern confirmed",
          description: "Price broke resistance with strong volume confirmation",
          action: "buy_yes",
          estimatedEdge: 6.1,
          risk: "low",
          detectedAt: "2026-01-26T13:45:00Z",
          indicators: [
            { name: "Pattern", value: "Bull Flag", signal: "bullish" },
            { name: "Support", value: "0.68¢", signal: "bullish" },
            { name: "Target", value: "0.82¢", signal: "bullish" },
          ],
        },
        {
          id: "5",
          type: "sentiment",
          marketId: "market-5",
          marketQuestion: "Will Apple hit $3T market cap in 2026?",
          confidence: 75,
          opportunity: "Positive sentiment shift",
          description: "Twitter/Reddit sentiment improved 40% in last 24h",
          action: "buy_yes",
          estimatedEdge: 4.3,
          risk: "medium",
          detectedAt: "2026-01-26T13:30:00Z",
          indicators: [
            { name: "Twitter Sentiment", value: "+45%", signal: "bullish" },
            { name: "Reddit Mentions", value: "↑ 180%", signal: "bullish" },
            { name: "News Sentiment", value: "Positive", signal: "bullish" },
          ],
        },
      ].filter((r) => scanType === "all" || r.type === scanType);
    },
    staleTime: 30000,
  });

  // Fetch stats
  const { data: stats } = useQuery<ScanStats>({
    queryKey: ["scan-stats"],
    queryFn: async () => {
      return {
        totalScanned: 487,
        opportunitiesFound: results?.length || 5,
        avgConfidence: results
          ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
          : 83,
        lastScanTime: new Date().toISOString(),
      };
    },
    staleTime: 30000,
  });

  const handleScan = async () => {
    setIsScanning(true);
    await refetch();
    setTimeout(() => setIsScanning(false), 2000);
  };

  const getTypeIcon = (type: ScanResult["type"]) => {
    switch (type) {
      case "arbitrage":
        return "🔄";
      case "momentum":
        return "🚀";
      case "anomaly":
        return "⚡";
      case "pattern":
        return "📈";
      case "sentiment":
        return "💬";
    }
  };

  const getTypeColor = (type: ScanResult["type"]) => {
    switch (type) {
      case "arbitrage":
        return { bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500" };
      case "momentum":
        return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500" };
      case "anomaly":
        return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500" };
      case "pattern":
        return { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500" };
      case "sentiment":
        return { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500" };
    }
  };

  const getRiskColor = (risk: ScanResult["risk"]) => {
    switch (risk) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-amber-400";
      case "high":
        return "text-red-400";
    }
  };

  const getActionLabel = (action: ScanResult["action"]) => {
    switch (action) {
      case "buy_yes":
        return { label: "BUY YES", color: "bg-green-600" };
      case "buy_no":
        return { label: "BUY NO", color: "bg-red-600" };
      case "wait":
        return { label: "WAIT", color: "bg-gray-600" };
      case "exit":
        return { label: "EXIT", color: "bg-orange-600" };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <main className="min-h-screen bg-[#0a0f14] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              AI Market <span className="text-teal-400">Scanner</span>
            </h1>
            <Link
              href="/home"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              ← Back
            </Link>
          </div>
          <p className="text-gray-400">
            AI-powered market scanner detects opportunities in real-time
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl p-4">
            <div className="text-white/80 text-xs mb-1">Markets Scanned</div>
            <div className="text-2xl font-bold text-white">{stats?.totalScanned || 0}</div>
          </div>

          <div className="bg-[#1a2332] border border-green-500/30 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Opportunities</div>
            <div className="text-2xl font-bold text-white">{stats?.opportunitiesFound || 0}</div>
          </div>

          <div className="bg-[#1a2332] border border-purple-500/30 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Avg Confidence</div>
            <div className="text-2xl font-bold text-white">
              {stats?.avgConfidence.toFixed(0) || 0}%
            </div>
          </div>

          <div className="bg-[#1a2332] border border-amber-500/30 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">Last Scan</div>
            <div className="text-sm font-bold text-white">
              {stats ? formatTimeAgo(stats.lastScanTime) : "Never"}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Scan Type Filter */}
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as any)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-teal-500 outline-none"
              >
                <option value="all">All Types</option>
                <option value="arbitrage">Arbitrage</option>
                <option value="momentum">Momentum</option>
                <option value="anomaly">Anomalies</option>
                <option value="pattern">Patterns</option>
                <option value="sentiment">Sentiment</option>
              </select>

              {/* Min Confidence Slider */}
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm whitespace-nowrap">Min: {minConfidence}%</span>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="flex-1 min-w-[120px]"
                />
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                isScanning
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-teal-500 hover:bg-teal-600 text-white"
              }`}
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Scan Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Detected Opportunities</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-gray-400 mt-4">Scanning markets...</p>
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => {
                const typeColor = getTypeColor(result.type);
                const action = getActionLabel(result.action);

                return (
                  <div
                    key={result.id}
                    className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-teal-500/50 transition-all"
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Left: Type & Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{getTypeIcon(result.type)}</span>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-1 ${typeColor.bg} ${typeColor.text} rounded text-xs font-bold uppercase`}
                              >
                                {result.type}
                              </span>
                              <span className="text-gray-500 text-xs">{formatTimeAgo(result.detectedAt)}</span>
                            </div>
                            <Link
                              href={`/markets/${result.marketId}`}
                              className="text-white font-medium hover:text-teal-400 transition-colors"
                            >
                              {result.marketQuestion}
                            </Link>
                          </div>
                        </div>

                        <div className="mb-3">
                          <h4 className="text-teal-400 font-bold mb-1">{result.opportunity}</h4>
                          <p className="text-gray-400 text-sm">{result.description}</p>
                        </div>

                        {/* Indicators */}
                        <div className="grid grid-cols-3 gap-3">
                          {result.indicators.map((indicator, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-2">
                              <div className="text-gray-500 text-xs mb-1">{indicator.name}</div>
                              <div
                                className={`text-sm font-bold ${
                                  indicator.signal === "bullish"
                                    ? "text-green-400"
                                    : indicator.signal === "bearish"
                                    ? "text-red-400"
                                    : "text-gray-400"
                                }`}
                              >
                                {indicator.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Action & Stats */}
                      <div className="md:w-48 flex flex-col gap-3">
                        <div className={`${action.color} text-white font-bold text-center py-3 rounded-lg`}>
                          {action.label}
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Confidence:</span>
                            <span className="text-white font-bold">{result.confidence}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Edge:</span>
                            <span className="text-green-400 font-bold">+{result.estimatedEdge.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Risk:</span>
                            <span className={`font-bold ${getRiskColor(result.risk)}`}>
                              {result.risk.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/markets/${result.marketId}`}
                          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-center text-sm"
                        >
                          View Market
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">No Opportunities Found</h3>
              <p className="text-gray-400 text-sm mb-4">
                Try lowering the minimum confidence or scan again
              </p>
              <button
                onClick={handleScan}
                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
              >
                Scan Again
              </button>
            </div>
          )}
        </div>

        {/* Premium Banner */}
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6">
          <h3 className="text-white font-bold text-lg mb-2">Unlock Premium AI Scanner 🤖</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white/80 text-sm">
            <div>✨ Real-time continuous scanning</div>
            <div>✨ Custom scan filters & alerts</div>
            <div>✨ Historical opportunity tracking</div>
            <div>✨ API access for automation</div>
          </div>
        </div>
      </div>
    </main>
  );
}
