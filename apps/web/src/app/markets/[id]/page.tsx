"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMarket } from "@/lib/api";

interface MarketDetail {
  id: string;
  polymarketId: string;
  question: string;
  description: string | null;
  category: string | null;
  endDate: string | null;
  qualityGrade: string | null;
  qualityScore: number | null;
  currentPrice: number | null;
  volume24h: number | null;
  liquidity: number | null;
  spread: number | null;
  depth: number | null;
  staleness: number | null;
  clusterLabel?: string | null;
  qualitySummary?: string | null;
  isLowQuality?: boolean;
}

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: market, isLoading, error } = useQuery<MarketDetail>({
    queryKey: ["market", id],
    queryFn: () => getMarket(id) as Promise<MarketDetail>,
    enabled: !!id,
    retry: 2,
  });

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return `${(price * 100).toFixed(1)}%`;
  };

  const formatVolume = (volume: number | null) => {
    if (volume === null || volume === 0) return "-";
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a1a] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-400">Loading market...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !market) {
    return (
      <main className="min-h-screen bg-[#0a0a1a] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
            <h2 className="text-lg font-semibold mb-2">Unable to load market</h2>
            <p className="text-sm mb-4">This market may not exist or the server is unavailable.</p>
            <Link href="/markets" className="text-primary-400 hover:underline">
              ← Back to Markets
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a1a] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link href="/markets" className="text-primary-400 hover:underline text-sm mb-6 inline-block">
          ← Back to Markets
        </Link>

        {/* Header */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-white">
              {market.question}
            </h1>
            {market.qualityGrade && (
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                market.qualityGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                market.qualityGrade === 'B' ? 'bg-blue-500/20 text-blue-400' :
                market.qualityGrade === 'C' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                Grade {market.qualityGrade}
              </span>
            )}
          </div>

          {market.description && (
            <p className="text-gray-400 text-sm mb-4">{market.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {market.category && (
              <span className="text-xs px-3 py-1.5 bg-gray-800 rounded-lg text-gray-400">
                {market.category}
              </span>
            )}
            {market.clusterLabel && (
              <span className="text-xs px-3 py-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                {market.clusterLabel}
              </span>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-white">
              {formatPrice(market.currentPrice)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {market.currentPrice !== null ? (market.currentPrice > 0.5 ? "Likely YES" : "Likely NO") : ""}
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">24h Volume</p>
            <p className="text-2xl font-bold text-white">
              {formatVolume(market.volume24h)}
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Liquidity</p>
            <p className="text-2xl font-bold text-white">
              {formatVolume(market.liquidity)}
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Spread</p>
            <p className="text-2xl font-bold text-white">
              {market.spread !== null ? `${(market.spread * 100).toFixed(1)}%` : "-"}
            </p>
            <p className={`text-xs mt-1 ${
              market.spread === null ? 'text-gray-500' :
              market.spread < 0.02 ? 'text-emerald-400' :
              market.spread < 0.05 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {market.spread === null ? "" :
               market.spread < 0.02 ? "Tight spread" :
               market.spread < 0.05 ? "Moderate spread" : "Wide spread"}
            </p>
          </div>
        </div>

        {/* End Date */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Resolution Date</p>
              <p className="text-lg font-semibold text-white">{formatDate(market.endDate)}</p>
            </div>
            {market.endDate && (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Time Remaining</p>
                <p className="text-lg font-semibold text-primary-400">
                  {(() => {
                    const hours = Math.max(0, (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60));
                    if (hours < 1) return "< 1 hour";
                    if (hours < 24) return `${Math.round(hours)} hours`;
                    if (hours < 168) return `${Math.round(hours / 24)} days`;
                    return `${Math.round(hours / 168)} weeks`;
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quality Summary */}
        {market.qualitySummary && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
            <p className="text-blue-300 text-sm">{market.qualitySummary}</p>
          </div>
        )}

        {/* Low Quality Warning */}
        {market.isLowQuality && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <p className="text-yellow-300 text-sm font-medium">⚠️ Low Quality Market</p>
            <p className="text-yellow-300/70 text-xs mt-1">
              This market may have wide spreads, low liquidity, or other issues that could affect execution.
            </p>
          </div>
        )}

        {/* Trade on Polymarket */}
        <div className="bg-gradient-to-r from-primary-500/20 to-purple-500/20 border border-primary-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Ready to Trade?</h3>
          <p className="text-gray-400 text-sm mb-4">
            Search for this market on Polymarket to trade
          </p>
          <a 
            href={`https://polymarket.com/markets?_q=${encodeURIComponent(market.question.slice(0, 50))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Find on Polymarket
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </main>
  );
}
