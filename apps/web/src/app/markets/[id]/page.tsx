"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { getMarket } from "@/lib/api";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { MarketBehaviorCard } from "@/components/MarketBehaviorCard";
import { ExposureRiskCard } from "@/components/ExposureRiskCard";
import { ProHistoryPlaceholder } from "@/components/ProHistoryPlaceholder";
import { BehaviorClusterBadge } from "@/components/BehaviorClusterBadge";
import { FlowTypeCard } from "@/components/FlowTypeCard";
import { PublicContextCard } from "@/components/PublicContextCard";
import { RetailSignalCard } from "@/components/RetailSignalCard";
import { ProfitSimulator } from "@/components/ProfitSimulator";
import { FlowGuardSection } from "@/components/FlowGuardBadge";

interface QualityBreakdown {
  spreadScore: number;
  depthScore: number;
  stalenessScore: number;
  volatilityScore: number;
}

interface MarketDetail {
  id: string;
  polymarketId: string;
  question: string;
  description: string | null;
  category: string | null;
  endDate: string | null;
  qualityGrade: string | null;
  qualityScore: number | null;
  qualityBreakdown: QualityBreakdown | null;
  qualitySummary: string | null;
  isLowQuality: boolean;
  currentPrice: number | null;
  volume24h: number | null;
  liquidity: number | null;
  spread: number | null;
  depth: number | null;
  staleness: number | null;
}

// Helper to determine time horizon label
function getTimeHorizon(endDate: string | null): { label: string; isShort: boolean } {
  if (!endDate) return { label: "Unknown", isShort: false };
  const now = new Date();
  const end = new Date(endDate);
  const hoursUntil = (end.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 1) return { label: "Minutes", isShort: true };
  if (hoursUntil < 24) return { label: "Hours", isShort: true };
  if (hoursUntil < 72) return { label: "Days", isShort: true };
  if (hoursUntil < 168) return { label: "Week", isShort: false };
  return { label: "Long-term", isShort: false };
}

// Helper to interpret spread for retail
function getSpreadInterpretation(spread: number | null): { label: string; color: string; explanation: string } {
  if (spread === null) return { label: "Unknown", color: "text-gray-500", explanation: "Spread data unavailable" };
  if (spread < 0.02) return { label: "Tight", color: "text-green-600 dark:text-green-400", explanation: "Low cost to enter/exit" };
  if (spread < 0.05) return { label: "Moderate", color: "text-yellow-600 dark:text-yellow-400", explanation: "Some execution cost" };
  return { label: "Wide", color: "text-red-600 dark:text-red-400", explanation: "High cost — use limit orders" };
}

// Helper to interpret volume
function getVolumeInterpretation(volume: number | null): { label: string; color: string } {
  if (volume === null || volume === 0) return { label: "No activity", color: "text-gray-500" };
  if (volume < 1000) return { label: "Very low", color: "text-red-600 dark:text-red-400" };
  if (volume < 10000) return { label: "Low", color: "text-yellow-600 dark:text-yellow-400" };
  if (volume < 100000) return { label: "Moderate", color: "text-blue-600 dark:text-blue-400" };
  return { label: "High", color: "text-green-600 dark:text-green-400" };
}

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: market, isLoading, error } = useQuery<MarketDetail>({
    queryKey: ["market", id],
    queryFn: () => getMarket(id) as Promise<MarketDetail>,
    enabled: !!id,
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
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Analyzing market...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading market: {(error as Error).message}
          </div>
        </div>
      </main>
    );
  }

  if (!market) return null;

  const timeHorizon = getTimeHorizon(market.endDate);
  const spreadInfo = getSpreadInterpretation(market.spread);
  const volumeInfo = getVolumeInterpretation(market.volume24h);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header with question */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                {market.question}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {market.category && (
                  <span className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                    {market.category}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full ${timeHorizon.isShort ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"}`}>
                  {timeHorizon.label} horizon
                </span>
                <BehaviorClusterBadge marketId={market.id} />
              </div>
            </div>
          </div>
        </header>

        {/* Short-horizon warning */}
        {timeHorizon.isShort && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  Short-window market — higher difficulty for retail
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Markets resolving in hours or less favor traders with real-time data feeds and automated execution.
                  Late entries in short-window markets often lose to spread and slippage.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key metrics with interpretations */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Market Price</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatPrice(market.currentPrice)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {market.currentPrice !== null && market.currentPrice > 0.85
                ? "Near certainty — little room for error"
                : market.currentPrice !== null && market.currentPrice < 0.15
                ? "Long shot — high risk/reward"
                : "Open outcome"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">24h Volume</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatVolume(market.volume24h)}
            </p>
            <p className={`text-xs mt-1 ${volumeInfo.color}`}>
              {volumeInfo.label} activity
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Spread (Cost)</p>
            <p className={`text-2xl font-bold ${spreadInfo.color}`}>
              {market.spread !== null ? `${(market.spread * 100).toFixed(1)}%` : "-"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {spreadInfo.explanation}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Activity</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {market.staleness !== null ? `${market.staleness}m` : "-"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {market.staleness !== null && market.staleness > 30
                ? "Stale — prices may be outdated"
                : "Recently active"}
            </p>
          </div>
        </div>

        {/* Price Chart */}
        <div className="mb-8">
          <PriceHistoryChart marketId={market.id} />
        </div>

        {/* Main Analysis Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Should you engage with this market?
          </h2>

          {/* Market Behavior Card - Full width for emphasis */}
          <div className="mb-6">
            <MarketBehaviorCard marketId={market.id} />
          </div>

          {/* Flow Type Card - Shows smart money vs retail activity */}
          <div className="mb-6">
            <FlowTypeCard marketId={market.id} />
          </div>

          {/* Flow Guard - Interprets flow for retail users */}
          <div className="mb-6">
            <FlowGuardSection marketId={market.id} />
          </div>

          {/* Public Context Card - Shows wallet participation and volume */}
          <div className="mb-6">
            <PublicContextCard marketId={market.id} />
          </div>

          {/* Retail Signals Card - Shows conditions for retail participation */}
          <div className="mb-6">
            <RetailSignalCard marketId={market.id} />
          </div>

          {/* Profit Simulator - Shows execution impact on returns */}
          <div className="mb-6">
            <ProfitSimulator
              currentPrice={market.currentPrice}
              spread={market.spread}
              marketQuestion={market.question}
            />
          </div>

          {/* Two-column layout for Exposure Risk and Pro Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExposureRiskCard marketId={market.id} limit={5} />
            <ProHistoryPlaceholder marketCategory={market.category} />
          </div>
        </div>

        {/* Resolution Details */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Resolution Details
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Resolves</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatDate(market.endDate)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Liquidity Available</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatVolume(market.liquidity)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Polymarket ID</dt>
              <dd className="font-mono text-sm text-gray-600 dark:text-gray-400">{market.polymarketId}</dd>
            </div>
          </dl>
        </div>

        {/* Description */}
        {market.description && (
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Resolution Criteria
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
              {market.description}
            </p>
          </div>
        )}

        {/* Action Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Next Steps
          </h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Add to Watchlist
            </button>
            <button className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
              Compare with longer-horizon markets
            </button>
            <a
              href={`https://polymarket.com/event/${market.polymarketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 inline-flex items-center gap-1"
            >
              View on Polymarket
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Poly Buddy provides analysis only. We do not execute trades or provide financial advice.
          </p>
        </div>
      </div>
    </main>
  );
}
