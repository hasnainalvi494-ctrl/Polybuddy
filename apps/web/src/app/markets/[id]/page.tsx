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
import { HiddenExposureWarning } from "@/components/HiddenExposureWarning";
import { SignalSummaryCard } from "@/components/SignalCard";

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
function getTimeHorizon(endDate: string | null): { label: string; isShort: boolean; hook: string } {
  if (!endDate) return { label: "Unknown", isShort: false, hook: "Resolution timeline not specified" };
  const now = new Date();
  const end = new Date(endDate);
  const hoursUntil = (end.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 1) return { label: "Minutes", isShort: true, hook: "Resolves imminently — execution speed is critical" };
  if (hoursUntil < 24) return { label: "Hours", isShort: true, hook: "Short window — real-time data advantage is significant" };
  if (hoursUntil < 72) return { label: "Days", isShort: true, hook: "Multi-day window — timing flexibility is limited" };
  if (hoursUntil < 168) return { label: "Week", isShort: false, hook: "Week horizon — allows deliberate positioning" };
  return { label: "Long-term", isShort: false, hook: "Extended timeline — patient capital has room to work" };
}

// Helper to interpret spread for retail
function getSpreadInterpretation(spread: number | null): { label: string; color: string; hook: string } {
  if (spread === null) return { label: "Unknown", color: "text-gray-500", hook: "Spread data unavailable" };
  if (spread < 0.02) return { label: "Tight", color: "text-emerald-600 dark:text-emerald-400", hook: "Low execution cost — edge translates cleanly" };
  if (spread < 0.05) return { label: "Moderate", color: "text-amber-600 dark:text-amber-400", hook: "Some friction — factor into position sizing" };
  return { label: "Wide", color: "text-rose-600 dark:text-rose-400", hook: "High friction — limit orders recommended" };
}

// Helper to interpret volume
function getVolumeInterpretation(volume: number | null): { label: string; color: string; hook: string } {
  if (volume === null || volume === 0) return { label: "No activity", color: "text-gray-500", hook: "Market is dormant" };
  if (volume < 1000) return { label: "Very low", color: "text-rose-600 dark:text-rose-400", hook: "Limited liquidity — slippage risk" };
  if (volume < 10000) return { label: "Low", color: "text-amber-600 dark:text-amber-400", hook: "Thin activity — exits may be costly" };
  if (volume < 100000) return { label: "Moderate", color: "text-sky-600 dark:text-sky-400", hook: "Adequate depth for most positions" };
  return { label: "High", color: "text-emerald-600 dark:text-emerald-400", hook: "Deep liquidity — execution should be clean" };
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
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading market signals...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-6 text-rose-700 dark:text-rose-400">
            Unable to load market signals. Please refresh.
          </div>
        </div>
      </main>
    );
  }

  if (!market) return null;

  const timeHorizon = getTimeHorizon(market.endDate);
  const spreadInfo = getSpreadInterpretation(market.spread);
  const volumeInfo = getVolumeInterpretation(market.volume24h);

  // Determine friction level based on spread and volume
  const frictionLevel = market.spread !== null && market.spread < 0.03 ? "low_friction" : "high_friction";
  const frictionConfidence = market.spread !== null ? Math.max(30, Math.min(95, 100 - market.spread * 500)) : 50;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-3">
                {market.question}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {market.category && (
                  <span className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 font-medium">
                    {market.category}
                  </span>
                )}
                <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                  timeHorizon.isShort
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                }`}>
                  {timeHorizon.label} horizon
                </span>
                <BehaviorClusterBadge marketId={market.id} />
              </div>
            </div>
          </div>
        </header>

        {/* Friction Signal Summary */}
        <div className="mb-8">
          <SignalSummaryCard
            signalType={frictionLevel}
            confidence={Math.round(frictionConfidence)}
            hook={spreadInfo.hook}
            enablesPoints={[
              frictionLevel === "low_friction" ? "Patient entries without significant execution cost" : "Requires careful position sizing",
              volumeInfo.hook,
            ]}
            watchPoints={[
              timeHorizon.hook,
            ]}
          />
        </div>

        {/* Timeline Signal */}
        {timeHorizon.isShort && (
          <div className="mb-8">
            <SignalSummaryCard
              signalType="timeline_active"
              confidence={85}
              hook="Short resolution window increases execution difficulty"
              enablesPoints={[
                "Fast traders have significant advantage",
                "Spread impact is proportionally higher",
              ]}
              watchPoints={[
                "Late entries often lose to execution costs",
              ]}
            />
          </div>
        )}

        {/* Hidden Exposure Signal */}
        <div className="mb-8">
          <HiddenExposureWarning marketId={market.id} />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Price</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {formatPrice(market.currentPrice)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {market.currentPrice !== null && market.currentPrice > 0.85
                ? "Near certainty implied"
                : market.currentPrice !== null && market.currentPrice < 0.15
                ? "Long shot"
                : "Open outcome"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">24h Volume</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {formatVolume(market.volume24h)}
            </p>
            <p className={`text-xs mt-2 ${volumeInfo.color}`}>
              {volumeInfo.label}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Spread</p>
            <p className={`text-3xl font-bold ${spreadInfo.color}`}>
              {market.spread !== null ? `${(market.spread * 100).toFixed(1)}%` : "-"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {spreadInfo.label}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Activity</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {market.staleness !== null ? `${market.staleness}m` : "-"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {market.staleness !== null && market.staleness > 30 ? "Stale" : "Recent"}
            </p>
          </div>
        </div>

        {/* Price Chart */}
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
          <PriceHistoryChart marketId={market.id} />
        </div>

        {/* Signal Analysis Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gray-900 dark:bg-gray-100 rounded-full" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Signal Analysis
            </h2>
          </div>

          <div className="space-y-6">
            <MarketBehaviorCard marketId={market.id} />
            <FlowTypeCard marketId={market.id} />
            <FlowGuardSection marketId={market.id} />
            <PublicContextCard marketId={market.id} />
            <RetailSignalCard marketId={market.id} />
            <ProfitSimulator
              currentPrice={market.currentPrice}
              spread={market.spread}
              marketQuestion={market.question}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ExposureRiskCard marketId={market.id} limit={5} />
            <ProHistoryPlaceholder marketCategory={market.category} />
          </div>
        </div>

        {/* Resolution Details */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mb-10">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Resolution
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Resolves</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatDate(market.endDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Liquidity</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatVolume(market.liquidity)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Market ID</dt>
              <dd className="font-mono text-sm text-gray-600 dark:text-gray-400">{market.polymarketId}</dd>
            </div>
          </dl>
        </div>

        {/* Description */}
        {market.description && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mb-10">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Resolution Criteria
            </h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm leading-relaxed">
              {market.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap gap-3 mb-4">
            <button className="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium">
              Add to Watchlist
            </button>
            <a
              href={`https://polymarket.com/event/${market.polymarketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 inline-flex items-center gap-2"
            >
              View on Polymarket
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Signals reflect structural conditions, not predictions. Analysis only — no execution or financial advice.
          </p>
        </div>
      </div>
    </main>
  );
}
