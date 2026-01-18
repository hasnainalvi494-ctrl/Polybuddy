"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface TradingPattern {
  id: string;
  patternName: string;
  patternType: string;
  confidenceScore: number;
  winRate: number;
  avgRoi: number;
  sharpeRatio: number;
  occurrences: number;
  marketPhase?: string;
  entryPriceRange?: { min: number; max: number; optimal: number };
  positionSizeRange?: { min: number; max: number; avg: number };
  holdingPeriodHours?: { min: number; max: number; avg: number };
  recentMatches?: number;
  recentAvgRoi?: number;
}

interface PatternMatch {
  pattern: {
    id: string;
    name: string;
    type: string;
    winRate: number;
    avgRoi: number;
  };
  matchScore: number;
  matchedFeatures: string[];
}

interface PredictionResult {
  prediction: {
    outcome: "win" | "loss";
    confidence: number;
    predictedRoi: number;
    reasoning: string[];
  };
  matchingPatterns: PatternMatch[];
  marketSentiment?: any;
  orderBookAnalysis?: any;
}

interface TraderCluster {
  id: string;
  clusterName: string;
  clusterType: string;
  avgPositionSize: number;
  avgHoldingHours: number;
  avgWinRate: number;
  avgRoi: number;
  traderCount: number;
  eliteTraderPercentage: number;
  clusterWinRate: number;
  clusterAvgRoi: number;
  clusterSharpeRatio: number;
}

export default function PatternAnalysisPage() {
  const searchParams = useSearchParams();
  const marketIdParam = searchParams.get("marketId");

  const [activeTab, setActiveTab] = useState<"patterns" | "analyze" | "clusters">("patterns");
  const [patterns, setPatterns] = useState<TradingPattern[]>([]);
  const [clusters, setClusters] = useState<TraderCluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analyze form
  const [marketId, setMarketId] = useState(marketIdParam || "");
  const [entryPrice, setEntryPrice] = useState("0.50");
  const [positionSize, setPositionSize] = useState("5000");
  const [holdingHours, setHoldingHours] = useState("48");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  useEffect(() => {
    if (marketIdParam) {
      fetchPatternsForMarket(marketIdParam);
    }
  }, [marketIdParam]);

  const fetchPatternsForMarket = async (mktId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://polybuddy-api-production.up.railway.app/api/patterns/${mktId}?limit=20`
      );
      if (!response.ok) throw new Error("Failed to fetch patterns");
      const data = await response.json();
      setPatterns(data.patterns || []);
    } catch (err: any) {
      setError(err.message);
      setPatterns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTraderClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://polybuddy-api-production.up.railway.app/api/patterns/trader-clusters"
      );
      if (!response.ok) throw new Error("Failed to fetch trader clusters");
      const data = await response.json();
      setClusters(data.clusters || []);
    } catch (err: any) {
      setError(err.message);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTrade = async () => {
    if (!marketId) {
      setError("Market ID is required");
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await fetch(
        "https://polybuddy-api-production.up.railway.app/api/patterns/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketId,
            entryPrice: parseFloat(entryPrice),
            positionSize: parseFloat(positionSize),
            holdingHours: parseFloat(holdingHours),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to analyze trade");
      const data = await response.json();
      setPrediction(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "clusters") {
      fetchTraderClusters();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🤖 AI Pattern Recognition
          </h1>
          <p className="text-gray-300">
            Machine learning-powered pattern analysis and trade predictions
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("patterns")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "patterns"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            📊 Trading Patterns
          </button>
          <button
            onClick={() => setActiveTab("analyze")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "analyze"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            🔮 Analyze Trade
          </button>
          <button
            onClick={() => setActiveTab("clusters")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "clusters"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            👥 Trader Clusters
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Trading Patterns Tab */}
        {activeTab === "patterns" && (
          <div>
            <div className="mb-4 p-4 bg-gray-800 rounded-lg">
              <label className="block text-white mb-2 font-medium">
                Search Patterns by Market ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  placeholder="Enter market UUID..."
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
                <button
                  onClick={() => fetchPatternsForMarket(marketId)}
                  disabled={!marketId || loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Loading..." : "Search"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4">Loading patterns...</p>
              </div>
            ) : patterns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {pattern.patternName}
                        </h3>
                        <span className="inline-block mt-2 px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm">
                          {pattern.patternType.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-400">
                          {pattern.winRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-400">Win Rate</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-400">Avg ROI</div>
                        <div className="text-xl font-bold text-emerald-400">
                          +{pattern.avgRoi.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Confidence</div>
                        <div className="text-xl font-bold text-blue-400">
                          {pattern.confidenceScore.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Occurrences</div>
                        <div className="text-xl font-bold text-white">
                          {pattern.occurrences}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Sharpe Ratio</div>
                        <div className="text-xl font-bold text-yellow-400">
                          {pattern.sharpeRatio.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {pattern.entryPriceRange && (
                      <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">
                          Entry Price Range
                        </div>
                        <div className="text-white">
                          {pattern.entryPriceRange.min.toFixed(2)} -{" "}
                          {pattern.entryPriceRange.max.toFixed(2)}
                          <span className="text-green-400 ml-2">
                            (Optimal: {pattern.entryPriceRange.optimal.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    )}

                    {pattern.marketPhase && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-400">Phase: </span>
                        <span className="text-white capitalize">
                          {pattern.marketPhase}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-400 text-lg">
                  Enter a market ID to discover trading patterns
                </p>
              </div>
            )}
          </div>
        )}

        {/* Analyze Trade Tab */}
        {activeTab === "analyze" && (
          <div>
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                🔮 Predict Trade Outcome
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">
                    Market ID
                  </label>
                  <input
                    type="text"
                    value={marketId}
                    onChange={(e) => setMarketId(e.target.value)}
                    placeholder="Market UUID"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm font-medium">
                    Entry Price (0-1)
                  </label>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    max="1"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm font-medium">
                    Position Size ($)
                  </label>
                  <input
                    type="number"
                    value={positionSize}
                    onChange={(e) => setPositionSize(e.target.value)}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm font-medium">
                    Holding Period (hours)
                  </label>
                  <input
                    type="number"
                    value={holdingHours}
                    onChange={(e) => setHoldingHours(e.target.value)}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={analyzeTrade}
                disabled={!marketId || loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all"
              >
                {loading ? "Analyzing..." : "🤖 Analyze Trade"}
              </button>
            </div>

            {/* Prediction Results */}
            {prediction && (
              <div className="space-y-6">
                {/* Main Prediction */}
                <div
                  className={`p-6 rounded-lg border-2 ${
                    prediction.prediction.outcome === "win"
                      ? "bg-green-900/20 border-green-500"
                      : "bg-red-900/20 border-red-500"
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {prediction.prediction.outcome === "win"
                          ? "✅ Predicted WIN"
                          : "❌ Predicted LOSS"}
                      </h3>
                      <p className="text-gray-300">
                        Confidence: {prediction.prediction.confidence}%
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">
                        {prediction.prediction.predictedRoi > 0 ? "+" : ""}
                        {prediction.prediction.predictedRoi.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Expected ROI</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">Reasoning:</h4>
                    {prediction.prediction.reasoning.map((reason, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-gray-300"
                      >
                        <span className="text-purple-400">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Matching Patterns */}
                {prediction.matchingPatterns.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">
                      📊 Similar Patterns
                    </h3>
                    <div className="space-y-3">
                      {prediction.matchingPatterns.map((match, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-gray-700 rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-white">
                              {match.pattern.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {match.pattern.type} •{" "}
                              {match.pattern.winRate.toFixed(1)}% win rate
                            </div>
                            <div className="text-xs text-purple-300 mt-1">
                              Matched: {match.matchedFeatures.join(", ")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">
                              {match.matchScore.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-400">Match</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Trader Clusters Tab */}
        {activeTab === "clusters" && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4">Loading trader clusters...</p>
              </div>
            ) : clusters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-all"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {cluster.clusterName}
                      </h3>
                      <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm">
                        {cluster.clusterType}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Win Rate:</span>
                        <span className="text-green-400 font-bold">
                          {cluster.clusterWinRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg ROI:</span>
                        <span className="text-emerald-400 font-bold">
                          +{cluster.clusterAvgRoi.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sharpe Ratio:</span>
                        <span className="text-yellow-400 font-bold">
                          {cluster.clusterSharpeRatio.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Traders:</span>
                        <span className="text-white font-bold">
                          {cluster.traderCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Elite %:</span>
                        <span className="text-purple-400 font-bold">
                          {cluster.eliteTraderPercentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">
                        Avg Position: ${cluster.avgPositionSize.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        Avg Holding: {cluster.avgHoldingHours.toFixed(0)}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-400 text-lg">
                  No trader clusters available yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
