"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface WhaleActivity {
  id: string;
  walletAddress: string;
  marketId: string;
  marketName: string | null;
  action: string;
  outcome: string;
  amountUsd: number;
  price: number | null;
  timestamp: string;
  internalMarketId: string | null;
}

interface TraderInfo {
  walletAddress: string;
  eliteScore: number | null;
  traderTier: string | null;
  riskProfile: string | null;
  userName: string | null;
  xUsername: string | null;
  winRate: number | null;
  totalProfit: number | null;
  totalVolume: number | null;
  tradeCount: number | null;
}

export default function WalletPage() {
  const params = useParams();
  const address = params.address as string;

  // Try to fetch trader info if they're in our database
  const { data: traderData } = useQuery<TraderInfo | null>({
    queryKey: ["trader", address],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_URL}/api/elite-traders?limit=500`);
        if (!response.ok) return null;
        const data = await response.json();
        const trader = data.traders?.find(
          (t: TraderInfo) => t.walletAddress.toLowerCase() === address.toLowerCase()
        );
        return trader || null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  // Fetch whale activity for this wallet
  const { data: whaleData, isLoading: isLoadingWhales } = useQuery<{ trades: WhaleActivity[] }>({
    queryKey: ["whale-activity", address],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/whale-activity?limit=100`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      // Filter for this wallet only
      const walletTrades = data.trades?.filter(
        (t: WhaleActivity) => t.walletAddress.toLowerCase() === address.toLowerCase()
      ) || [];
      return { trades: walletTrades };
    },
    staleTime: 30000,
  });

  const formatAddress = (addr: string) => {
    if (!addr) return "-";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatAmount = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getTierColor = (tier: string | null) => {
    switch (tier?.toLowerCase()) {
      case "elite":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "strong":
        return "bg-teal-500/20 text-teal-300 border-teal-500/50";
      case "moderate":
        return "bg-sky-500/20 text-sky-300 border-sky-500/50";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0a0f14]">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/whales"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Whale Activity
        </Link>

        {/* Wallet Header */}
        <div className="bg-[#111820] rounded-xl border border-[#243040] p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {traderData?.userName || "Wallet"}
              </h1>
              <p className="font-mono text-gray-400 text-sm break-all">{address}</p>
              
              {traderData?.xUsername && (
                <a
                  href={`https://x.com/${traderData.xUsername.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-teal-400 mt-2"
                >
                  @{traderData.xUsername.replace("@", "")}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {traderData?.traderTier && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getTierColor(traderData.traderTier)}`}>
                {traderData.traderTier.toUpperCase()} TRADER
              </span>
            )}
          </div>

          {/* External Links */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-[#243040]">
            <a
              href={`https://polymarket.com/profile/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-sm transition-colors border border-purple-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              View on Polymarket
              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href={`https://polygonscan.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#1a2332] hover:bg-[#243040] text-gray-300 rounded-lg text-sm transition-colors border border-[#243040]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View on Polygonscan
              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Trader Stats (if available) */}
          {traderData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#243040]">
              {traderData.eliteScore && (
                <div className="p-3 bg-[#0a0f14] rounded-lg">
                  <p className="text-xs text-gray-500">Elite Score</p>
                  <p className="text-xl font-bold text-teal-400">{traderData.eliteScore.toFixed(1)}</p>
                </div>
              )}
              {traderData.winRate && (
                <div className="p-3 bg-[#0a0f14] rounded-lg">
                  <p className="text-xs text-gray-500">Win Rate</p>
                  <p className="text-xl font-bold text-emerald-400">{traderData.winRate.toFixed(1)}%</p>
                </div>
              )}
              {traderData.totalProfit !== null && (
                <div className="p-3 bg-[#0a0f14] rounded-lg">
                  <p className="text-xs text-gray-500">Total Profit</p>
                  <p className={`text-xl font-bold ${(traderData.totalProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatAmount(traderData.totalProfit || 0)}
                  </p>
                </div>
              )}
              {traderData.totalVolume && (
                <div className="p-3 bg-[#0a0f14] rounded-lg">
                  <p className="text-xs text-gray-500">Volume</p>
                  <p className="text-xl font-bold text-white">{formatAmount(traderData.totalVolume)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Whale Activity for this wallet */}
        <div className="bg-[#111820] rounded-xl border border-[#243040] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Big Trades</h2>

          {isLoadingWhales && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading trades...</p>
            </div>
          )}

          {!isLoadingWhales && (!whaleData?.trades || whaleData.trades.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p>No recent whale trades found for this wallet in our database.</p>
              <a
                href={`https://polymarket.com/profile/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-teal-400 hover:text-teal-300"
              >
                View full history on Polymarket
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {whaleData?.trades && whaleData.trades.length > 0 && (
            <div className="space-y-3">
              {whaleData.trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 bg-[#0a0f14] rounded-lg border border-[#1a2332]"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          trade.action === "buy"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {trade.action === "buy" ? "BUY" : "SELL"} {trade.outcome.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{formatTimeAgo(trade.timestamp)}</span>
                    </div>
                    <p className="text-white font-medium truncate">
                      {trade.marketName || `Market #${trade.marketId.slice(0, 8)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${trade.action === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                      {formatAmount(trade.amountUsd)}
                    </p>
                    {trade.price && (
                      <p className="text-xs text-gray-500">@ {(trade.price * 100).toFixed(1)}¢</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
