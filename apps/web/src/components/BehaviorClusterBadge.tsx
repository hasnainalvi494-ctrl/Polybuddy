"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketBehavior, type BehaviorClusterType, type RetailFriendliness } from "@/lib/api";
import { WhyBullets } from "./WhyBullets";
import { useState } from "react";

const FRIENDLINESS_STYLES: Record<RetailFriendliness, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  favorable: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    label: "Favorable for Retail",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  neutral: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-400",
    label: "Neutral for Retail",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  unfavorable: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    label: "Unfavorable for Retail",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

type BehaviorClusterBadgeProps = {
  marketId: string;
};

const CLUSTER_COLORS: Record<BehaviorClusterType, { bg: string; text: string; border: string }> = {
  scheduled_event: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  continuous_info: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  binary_catalyst: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  high_volatility: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  long_duration: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  sports_scheduled: {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
  },
};

const CLUSTER_ICONS: Record<BehaviorClusterType, React.ReactNode> = {
  scheduled_event: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  continuous_info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  binary_catalyst: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  high_volatility: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  long_duration: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  sports_scheduled: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
};

function DimensionBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 dark:text-gray-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-gray-600 dark:text-gray-300 w-8 text-right">{value}</span>
    </div>
  );
}

export function BehaviorClusterBadge({ marketId }: BehaviorClusterBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["marketBehavior", marketId],
    queryFn: () => getMarketBehavior(marketId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
    );
  }

  if (error || !data) {
    return null;
  }

  const colors = CLUSTER_COLORS[data.cluster];
  const icon = CLUSTER_ICONS[data.cluster];

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${colors.bg} ${colors.text} border ${colors.border} hover:opacity-90`}
      >
        {icon}
        <span>{data.clusterLabel}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {data.displayInfo.label}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {data.confidence}% confidence
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {data.explanation}
          </p>

          {/* Dimensions */}
          <div className="space-y-2 mb-4">
            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Behavior Dimensions
            </h5>
            <DimensionBar label="Info Cadence" value={data.dimensions.infoCadence} />
            <DimensionBar label="Info Structure" value={data.dimensions.infoStructure} />
            <DimensionBar label="Liquidity" value={data.dimensions.liquidityStability} />
            <DimensionBar label="Time Horizon" value={data.dimensions.timeToResolution} />
            <DimensionBar label="Concentration" value={data.dimensions.participantConcentration} />
          </div>

          {/* Why Bullets */}
          <div className="mb-4">
            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Classification Factors
            </h5>
            <WhyBullets bullets={data.whyBullets} />
          </div>

          {/* Retail Interpretation */}
          {data.retailInterpretation && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              {/* Friendliness Badge */}
              <div className={`flex items-center gap-2 p-2 rounded-lg ${FRIENDLINESS_STYLES[data.retailInterpretation.friendliness].bg}`}>
                <span className={FRIENDLINESS_STYLES[data.retailInterpretation.friendliness].text}>
                  {FRIENDLINESS_STYLES[data.retailInterpretation.friendliness].icon}
                </span>
                <span className={`text-sm font-medium ${FRIENDLINESS_STYLES[data.retailInterpretation.friendliness].text}`}>
                  {FRIENDLINESS_STYLES[data.retailInterpretation.friendliness].label}
                </span>
              </div>

              {/* What this means */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  What This Means for Retail
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {data.retailInterpretation.whatThisMeansForRetail}
                </p>
              </div>

              {/* Common Mistake */}
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Common Mistake
                </h5>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {data.retailInterpretation.commonMistake}
                </p>
              </div>

              {/* When Retail Can Compete */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  When Retail Can Compete
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {data.retailInterpretation.whenRetailCanCompete}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
