"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

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
}

// Plain-language crowd description
function getCrowdLabel(summary: string): string {
  switch (summary) {
    case "few_dominant":
      return "Big players active";
    case "mixed_participation":
      return "Mixed crowd";
    case "broad_retail":
      return "Retail-heavy";
    default:
      return "Various players";
  }
}

// Plain-language activity label
function getActivityLabel(band: string): string {
  switch (band) {
    case "strong":
      return "Active";
    case "moderate":
      return "Moderate";
    case "limited":
      return "Quiet";
    default:
      return "Normal";
  }
}

// Translate formal "interesting reason" to trader talk
function getPlainReason(reason: string, summary: string, band: string): string {
  // Map the formal reasons to plain language
  if (reason.includes("Strong structural conditions")) {
    return "Good conditions, experienced players here";
  }
  if (reason.includes("Favorable structure with less crowded")) {
    return "Good setup, not too crowded";
  }
  if (reason.includes("Historically favorable market")) {
    return "Usually trades cleanly";
  }
  if (reason.includes("Concentrated participation")) {
    return "Few big players running this";
  }
  if (reason.includes("High activity from experienced")) {
    return "Experienced traders active";
  }

  // Fallback based on data
  if (summary === "few_dominant" && band === "historically_favorable") {
    return "Big players, orderly market";
  }
  if (summary === "broad_retail") {
    return "Lots of retail activity";
  }
  return "Worth watching";
}

function CarouselCard({ market }: { market: InterestingMarket }) {
  const crowdLabel = getCrowdLabel(market.participationSummary);
  const activityLabel = getActivityLabel(market.participantQualityBand);
  const plainReason = getPlainReason(market.interestingReason, market.participationSummary, market.setupQualityBand);

  return (
    <Link
      href={`/markets/${market.marketId}`}
      className="flex-shrink-0 w-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-colors p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
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

      {/* Why it's interesting - plain language */}
      <div className="mb-4">
        <span className="inline-flex px-2 py-1 text-xs rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium">
          {plainReason}
        </span>
      </div>

      {/* Simple crowd + activity info */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{crowdLabel}</span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span>{activityLabel} activity</span>
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
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/structurally-interesting?limit=${limit}`
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
              className="flex-shrink-0 w-80 h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return null; // Fail silently
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
              Interesting crowd patterns right now
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
export function StructurallyInterestingCarouselDark({ limit = 8 }: { limit?: number }) {
  const { data, isLoading, error } = useQuery<InterestingMarket[]>({
    queryKey: ["structurally-interesting", limit],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/structurally-interesting?limit=${limit}`
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
              Interesting crowd patterns
            </p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 h-40 bg-gray-900/50 rounded-xl animate-pulse border border-gray-800/50"
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
          <div className="w-1 h-8 bg-emerald-500/80 rounded-full" />
          <div>
            <h2 className="text-xl font-semibold text-gray-100 tracking-tight">
              Markets Worth Watching
            </h2>
            <p className="text-[13px] text-gray-500">
              Interesting crowd patterns
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
          {data.map((market) => (
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

function DarkCarouselCard({ market }: { market: InterestingMarket }) {
  const crowdLabel = getCrowdLabel(market.participationSummary);
  const activityLabel = getActivityLabel(market.participantQualityBand);
  const plainReason = getPlainReason(market.interestingReason, market.participationSummary, market.setupQualityBand);

  return (
    <Link
      href={`/markets/${market.marketId}`}
      className="flex-shrink-0 w-80 bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-800/50 hover:border-emerald-500/30 transition-colors p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
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

      {/* Why it's interesting */}
      <p className="text-[12px] text-emerald-400/80 mb-3 line-clamp-1">
        {plainReason}
      </p>

      {/* Simple crowd + activity info */}
      <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-500">
        <span>{crowdLabel}</span>
        <span className="text-gray-700">|</span>
        <span>{activityLabel} activity</span>
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
