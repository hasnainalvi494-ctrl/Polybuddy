"use client";

export const dynamic = "force-dynamic";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getBestBets, getEliteTraders } from "@/lib/api";

// Use environment variable or fallback to Railway
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://polybuddy-api-production.up.railway.app";

interface BestBetSignal {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketCategory: string | null;
  confidence: number;
  signalStrength: "elite" | "strong" | "moderate" | "weak";
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  outcome: "yes" | "no";
  traderAddress: string;
  traderWinRate: number;
  traderEliteScore: number;
  timeHorizon: string;
  generatedAt: string;
  expiresAt: string;
}

interface EliteTrader {
  walletAddress: string;
  eliteScore: number;
  traderTier: string;
  winRate: number;
  totalProfit: number;
  sharpeRatio: number;
  tradeCount: number;
}

interface WhaleTrade {
  id: string;
  walletAddress: string;
  marketId: string;
  marketName: string;
  action: string;
  outcome: string;
  amountUsd: number;
  price: number | null;
  priceImpact: number | null;
  timestamp: string;
  isHot: boolean;
}

interface ArbitrageOpportunity {
  marketId: string;
  marketName: string;
  yesPrice: number;
  noPrice: number;
  spread: number;
  profitPer100: number;
  roiPercent: number;
  resolvesIn: string;
  difficulty: "easy" | "medium" | "hard";
}

export default function HomePage() {
  // Helper for fetching with timeout and retry (handles Railway cold starts)
  const fetchWithRetry = async (url: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[API] Fetching: ${url} (attempt ${i + 1}/${retries})`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for cold starts
        const response = await fetch(url, { 
          signal: controller.signal,
          cache: 'no-store', // Prevent caching
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
          },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          console.error(`[API] HTTP ${response.status}: ${response.statusText}`);
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        console.log(`[API] Success:`, data);
        return data;
      } catch (error) {
        console.error(`[API] Error (attempt ${i + 1}):`, error);
        if (i === retries - 1) throw error;
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
      }
    }
  };

  // Fetch best bets
  const { data: bestBetsData, isLoading: loadingBets, error: betsError } = useQuery({
    queryKey: ["best-bets-home"],
    queryFn: () => fetchWithRetry(`${API_URL}/api/best-bets-signals`),
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 2000,
    staleTime: 60000, // Keep data fresh for 1 minute
  });

  // Fetch elite traders
  const { data: eliteTraders, isLoading: loadingTraders, error: tradersError } = useQuery({
    queryKey: ["elite-traders-home"],
    queryFn: async () => {
      const data = await fetchWithRetry(`${API_URL}/api/elite-traders?limit=5`);
      return data.traders || [];
    },
    refetchInterval: 60000,
    retry: 3,
    retryDelay: 2000,
    staleTime: 60000,
  });
  
  // Log errors
  if (betsError) console.error("[ERROR] Best bets:", betsError);
  if (tradersError) console.error("[ERROR] Elite traders:", tradersError);

  // Fetch whale activity
  const { data: whaleData, isLoading: loadingWhales } = useQuery({
    queryKey: ["whale-activity-home"],
    queryFn: () => fetchWithRetry(`${API_URL}/api/whale-activity?limit=5`),
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 2000,
    staleTime: 60000,
  });

  // Fetch arbitrage opportunities
  const { data: arbitrageData, isLoading: loadingArbitrage } = useQuery({
    queryKey: ["arbitrage-home"],
    queryFn: () => fetchWithRetry(`${API_URL}/api/arbitrage`),
    refetchInterval: 60000,
    retry: 3,
    retryDelay: 2000,
    staleTime: 60000,
  });

  const bestBets: BestBetSignal[] = bestBetsData?.signals?.slice(0, 5) || [];
  const whaleTrades: WhaleTrade[] = whaleData?.trades || [];
  const arbitrageOpps: ArbitrageOpportunity[] = arbitrageData?.opportunities?.slice(0, 5) || [];

  const getSignalColor = (strength: string) => {
    switch (strength) {
      case "elite":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "strong":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      case "moderate":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "elite":
        return "text-yellow-400";
      case "expert":
        return "text-purple-400";
      case "advanced":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "-";
    return `${(price * 100).toFixed(0)}¢`;
  };

  const formatUsd = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatAddress = (address: string) => {
    if (!address) return "-";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const isAnyLoading = loadingBets || loadingTraders || loadingWhales || loadingArbitrage;
  const hasAnyData = bestBets.length > 0 || (eliteTraders && eliteTraders.length > 0) || whaleTrades.length > 0;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0a0a1a]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Loading Banner - only show when loading AND no cached data */}
        {isAnyLoading && !hasAnyData && (
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 text-center animate-pulse">
            <div className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-primary-300 font-medium">Connecting to live data...</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">This may take a few seconds on first load</p>
          </div>
        )}

        {/* Error Banner - show API errors */}
        {(betsError || tradersError) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-300 font-medium">Unable to connect to API</p>
                <p className="text-sm text-gray-400 mt-1">
                  {betsError instanceof Error ? betsError.message : 'API connection error'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  API: {API_URL}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center py-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            PolyBuddy
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Your AI-powered Polymarket trading assistant with elite trader signals, 
            whale tracking, and arbitrage detection.
          </p>
        </section>

        {/* Best Bets Section - Featured */}
        <section className="bg-gradient-to-br from-[#14142b] to-[#1a1a3e] rounded-2xl border border-[#252545] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Best Bets</h2>
                <p className="text-sm text-gray-400">AI-powered trading signals</p>
              </div>
            </div>
            <Link 
              href="/best-bets" 
              className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1"
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loadingBets ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          ) : bestBets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No active signals at the moment</p>
              <p className="text-sm mt-1">Check back soon for new opportunities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bestBets.map((bet) => (
                <Link
                  key={bet.id}
                  href={`/markets/${bet.marketId}`}
                  className="block bg-[#0a0a1a]/50 rounded-xl p-4 hover:bg-[#1a1a2e] transition-all border border-transparent hover:border-primary-500/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-100 font-medium line-clamp-2">{bet.marketQuestion}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSignalColor(bet.signalStrength)}`}>
                          {bet.signalStrength.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-400">
                          {bet.confidence >= 1 ? bet.confidence.toFixed(0) : (bet.confidence * 100).toFixed(0)}% confidence
                        </span>
                        <span className="text-sm text-gray-500">
                          Entry: {formatPrice(bet.entryPrice)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${bet.outcome === "yes" ? "text-emerald-400" : "text-red-400"}`}>
                        {bet.outcome.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">{bet.timeHorizon}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Two Column Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Elite Traders Section */}
          <section className="bg-[#14142b] rounded-2xl border border-[#252545] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Elite Traders</h2>
              </div>
              <Link 
                href="/elite-traders" 
                className="text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                View All →
              </Link>
            </div>

            {loadingTraders ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
              </div>
            ) : !eliteTraders || eliteTraders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No elite traders found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eliteTraders.slice(0, 5).map((trader: EliteTrader, index: number) => (
                  <div
                    key={trader.walletAddress}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a1a]/50 hover:bg-[#1a1a2e] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-500 w-6">#{index + 1}</span>
                      <div>
                        <p className="font-mono text-sm text-gray-200">{formatAddress(trader.walletAddress)}</p>
                        <p className={`text-xs ${getTierColor(trader.traderTier)}`}>{trader.traderTier || "Trader"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-semibold">{formatUsd(trader.totalProfit || 0)}</p>
                      <p className="text-xs text-gray-400">{(trader.winRate || 0).toFixed(0)}% win rate</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Whale Activity Section */}
          <section className="bg-[#14142b] rounded-2xl border border-[#252545] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🐋</span>
                </div>
                <h2 className="text-xl font-bold text-white">Whale Activity</h2>
              </div>
            </div>

            {loadingWhales ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
              </div>
            ) : whaleTrades.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No recent whale activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {whaleTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-3 rounded-lg bg-[#0a0a1a]/50 hover:bg-[#1a1a2e] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {trade.isHot && (
                          <span className="text-orange-400 animate-pulse">🔥</span>
                        )}
                        <span className={`text-sm font-medium ${trade.action === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                          {trade.action.toUpperCase()} {trade.outcome.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white font-semibold">{formatUsd(trade.amountUsd)}</span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-1 mt-1">{trade.marketName}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(trade.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Arbitrage Section */}
        <section className="bg-[#14142b] rounded-2xl border border-[#252545] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Arbitrage Opportunities</h2>
                <p className="text-sm text-gray-400">Risk-free profit opportunities</p>
              </div>
            </div>
          </div>

          {loadingArbitrage ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          ) : arbitrageOpps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No arbitrage opportunities found</p>
              <p className="text-sm mt-1">Markets are efficiently priced</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-[#252545]">
                    <th className="pb-3 font-medium">Market</th>
                    <th className="pb-3 font-medium text-center">YES / NO</th>
                    <th className="pb-3 font-medium text-right">ROI</th>
                    <th className="pb-3 font-medium text-right">Profit/$100</th>
                    <th className="pb-3 font-medium text-right">Resolves</th>
                    <th className="pb-3 font-medium text-center">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitrageOpps.map((opp) => (
                    <tr key={opp.marketId} className="border-b border-[#252545]/50 hover:bg-[#1a1a2e]">
                      <td className="py-3 pr-4">
                        <Link href={`/markets/${opp.marketId}`} className="text-gray-200 hover:text-primary-400 line-clamp-1">
                          {opp.marketName}
                        </Link>
                      </td>
                      <td className="py-3 text-center font-mono">
                        <span className="text-emerald-400">{(opp.yesPrice * 100).toFixed(0)}¢</span>
                        <span className="text-gray-500 mx-1">/</span>
                        <span className="text-red-400">{(opp.noPrice * 100).toFixed(0)}¢</span>
                      </td>
                      <td className="py-3 text-right text-emerald-400 font-semibold">{opp.roiPercent.toFixed(1)}%</td>
                      <td className="py-3 text-right text-white">${opp.profitPer100.toFixed(2)}</td>
                      <td className="py-3 text-right text-gray-400">{opp.resolvesIn}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          opp.difficulty === "easy" ? "bg-emerald-500/20 text-emerald-400" :
                          opp.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {opp.difficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/markets"
            className="bg-[#14142b] rounded-xl border border-[#252545] p-4 hover:border-primary-500/50 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white">Markets</h3>
            <p className="text-sm text-gray-400">Explore all markets</p>
          </Link>

          <Link
            href="/copy-trading"
            className="bg-[#14142b] rounded-xl border border-[#252545] p-4 hover:border-primary-500/50 transition-all group"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white">Copy Trading</h3>
            <p className="text-sm text-gray-400">Follow elite traders</p>
          </Link>

          <Link
            href="/calculator"
            className="bg-[#14142b] rounded-xl border border-[#252545] p-4 hover:border-primary-500/50 transition-all group"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white">Calculator</h3>
            <p className="text-sm text-gray-400">Position sizing</p>
          </Link>

          <Link
            href="/leaderboard"
            className="bg-[#14142b] rounded-xl border border-[#252545] p-4 hover:border-primary-500/50 transition-all group"
          >
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white">Leaderboard</h3>
            <p className="text-sm text-gray-400">Top performers</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
