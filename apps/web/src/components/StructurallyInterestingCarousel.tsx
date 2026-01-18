"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getMomentum,
  getCrowding,
  getRetailRisk,
  hasNoEdge,
  MomentumBadge,
  CrowdingBadge,
  RetailRiskBadge,
  RealDataCues,
  type MarketParticipationData,
} from "./MarketScannerChips";
import { FloatingTrendingBadge } from "./TrendingBadge";

interface InterestingMarket {
  marketId: string;
  question: string;
  category: string | null;
  currentPrice: number | null;
  setupQualityScore: number;
  setupQualityBand: string;
  participantQualityScore: number;
  participantQualityBand: string;
  participationSummary: string;
  behaviorInsight: string;
  interestingReason: string;
  updatedAt?: string;
  tradeCount24h?: number;
}

function CarouselCard({ market }: { market: InterestingMarket }) {
  const data: MarketParticipationData = {
    participantQualityScore: market.participantQualityScore,
    setupQualityScore: market.setupQualityScore,
    participationSummary: market.participationSummary,
    setupQualityBand: market.setupQualityBand,
  };

  const momentum = getMomentum(data.participantQualityScore, data.setupQualityScore, data.participationSummary);
  const crowding = getCrowding(data.participationSummary);
  const risk = getRetailRisk(data.participationSummary, momentum.state);
  const noEdge = hasNoEdge(data.participationSummary, momentum.state, data.participantQualityScore);

  // Determine if market is trending based on trade count
  const isTrending = (market.tradeCount24h || 0) > 50;
  const isHot = (market.tradeCount24h || 0) > 100;

  return (
    <Link
      href={`/markets/${market.marketId}`}
      className="flex-shrink-0 w-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-colors p-5 relative"
    >
      {/* Trending Badge */}
      {isHot && <FloatingTrendingBadge variant="hot" />}
      {!isHot && isTrending && <FloatingTrendingBadge variant="trending" />}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {market.category || "Market"}
        </span>
        {market.currentPrice !== null && (
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {(market.currentPrice * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-3 min-h-[2.5rem]">
        {market.question}
      </h3>

      {/* Scanner chips row */}
      {noEdge ? (
        <div className="mb-3">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">
            No clear edge right now
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <CrowdingBadge crowding={crowding} />
          <MomentumBadge momentum={momentum} />
          <RetailRiskBadge risk={risk} />
        </div>
      )}

      {/* Real data cues */}
      <div className="mb-3">
        <RealDataCues
          updatedAt={market.updatedAt || new Date().toISOString()}
          tradeCount={market.tradeCount24h}
        />
      </div>

      {/* View link */}
      <div className="flex items-center justify-end">
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          See who's in
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export function StructurallyInterestingCarousel({ limit = 8 }: { limit?: number }) {
  const { data, isLoading, error } = useQuery<InterestingMarket[]>({
    queryKey: ["structurally-interesting", limit],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://polybuddy-api-production.up.railway.app"}/api/markets/structurally-interesting?limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Markets Worth Watching
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 h-44 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-emerald-500 rounded-full" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Markets Worth Watching
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Scan for crowding, momentum & risk
            </p>
          </div>
        </div>
        <Link
          href="/markets"
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1"
        >
          View all markets
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Horizontal scroll carousel */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
          {data.map((market) => (
            <CarouselCard key={market.marketId} market={market} />
          ))}
        </div>

        {/* Fade edge indicators */}
        <div className="absolute top-0 right-0 bottom-4 w-16 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none" />
      </div>

      {/* Minimal disclaimer */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Based on who's trading, not a prediction.
      </p>
    </div>
  );
}

// Dark mode version for Pulse page
function DarkCarouselCard({ market }: { market: InterestingMarket }) {
  const data: MarketParticipationData = {
    participantQualityScore: market.participantQualityScore,
    setupQualityScore: market.setupQualityScore,
    participationSummary: market.participationSummary,
    setupQualityBand: market.setupQualityBand,
  };

  const momentum = getMomentum(data.participantQualityScore, data.setupQualityScore, data.participationSummary);
  const crowding = getCrowding(data.participationSummary);
  const risk = getRetailRisk(data.participationSummary, momentum.state);
  const noEdge = hasNoEdge(data.participationSummary, momentum.state, data.participantQualityScore);

  return (
    <Link
      href={`/markets/${market.marketId}`}
      className="flex-shrink-0 w-80 bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-800/50 hover:border-emerald-500/30 transition-colors p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-gray-600">
          {market.category || "Market"}
        </span>
        {market.currentPrice !== null && (
          <span className="text-[11px] font-medium text-gray-400">
            {(market.currentPrice * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-[15px] font-semibold text-gray-100 line-clamp-2 mb-3 min-h-[2.5rem]">
        {market.question}
      </h3>

      {/* Scanner chips row */}
      {noEdge ? (
        <div className="mb-3">
          <span className="text-[10px] text-gray-500 italic">
            No clear edge right now
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <CrowdingBadge crowding={crowding} />
          <MomentumBadge momentum={momentum} />
          <RetailRiskBadge risk={risk} />
        </div>
      )}

      {/* Real data cues */}
      <div className="mb-3">
        <RealDataCues
          updatedAt={market.updatedAt || new Date().toISOString()}
          tradeCount={market.tradeCount24h}
        />
      </div>

      {/* View link */}
      <div className="flex items-center justify-end">
        <span className="text-[11px] text-emerald-400/80 flex items-center gap-1">
          See who's in
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export function StructurallyInterestingCarouselDark({ limit = 8 }: { limit?: number }) {
  const { data, isLoading, error } = useQuery<InterestingMarket[]>({
    queryKey: ["structurally-interesting", limit],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://polybuddy-api-production.up.railway.app"}/api/markets/structurally-interesting?limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-emerald-500/80 rounded-full" />
          <div>
            <h2 className="text-xl font-semibold text-gray-100 tracking-tight">
              Markets Worth Watching
            </h2>
            <p className="text-[13px] text-gray-500">
              Scan for crowding & momentum
            </p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 h-44 bg-gray-900/50 rounded-xl animate-pulse border border-gray-800/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  // Sort to prefer markets with building interest
  const sortedData = [...data].sort((a, b) => {
    const aMom = getMomentum(a.participantQualityScore, a.setupQualityScore, a.participationSummary);
    const bMom = getMomentum(b.participantQualityScore, b.setupQualityScore, b.participationSummary);

    if (aMom.state === "building" && bMom.state !== "building") return -1;
    if (bMom.state === "building" && aMom.state !== "building") return 1;

    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-emerald-500/80 rounded-full" />
          <div>
            <h2 className="text-xl font-semibold text-gray-100 tracking-tight">
              Markets Worth Watching
            </h2>
            <p className="text-[13px] text-gray-500">
              Scan for crowding & momentum
            </p>
          </div>
        </div>
        <Link
          href="/markets"
          className="text-[13px] text-emerald-400/80 hover:text-emerald-400 flex items-center gap-1"
        >
          View all
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Horizontal scroll carousel */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
          {sortedData.map((market) => (
            <DarkCarouselCard key={market.marketId} market={market} />
          ))}
        </div>

        {/* Fade edge */}
        <div className="absolute top-0 right-0 bottom-4 w-16 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none" />
      </div>

      {/* Minimal disclaimer */}
      <p className="text-xs text-gray-600">
        Based on who's trading, not a prediction.
      </p>
    </div>
  );
}
