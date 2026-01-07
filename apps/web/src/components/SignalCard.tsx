"use client";

import { useState } from "react";
import Link from "next/link";
import { MiniSparkline, LiquidityBar, VolatilityIndicator } from "./MiniSparkline";

// Signal types and their visual configurations
export type SignalType =
  | "low_friction"
  | "high_friction"
  | "structure_shift"
  | "timeline_active"
  | "price_divergence"
  | "flow_signal"
  | "linked_outcomes";

type SignalConfig = {
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  label: string;
};

const SIGNAL_CONFIGS: Record<SignalType, SignalConfig> = {
  low_friction: {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/10",
    borderColor: "border-emerald-100 dark:border-emerald-900/30",
    dotColor: "bg-emerald-500",
    label: "Low Friction",
  },
  high_friction: {
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/10",
    borderColor: "border-rose-100 dark:border-rose-900/30",
    dotColor: "bg-rose-500",
    label: "High Friction",
  },
  structure_shift: {
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-900/10",
    borderColor: "border-violet-100 dark:border-violet-900/30",
    dotColor: "bg-violet-500",
    label: "Structure Shift",
  },
  timeline_active: {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/10",
    borderColor: "border-amber-100 dark:border-amber-900/30",
    dotColor: "bg-amber-500",
    label: "Timeline Active",
  },
  price_divergence: {
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-900/10",
    borderColor: "border-sky-100 dark:border-sky-900/30",
    dotColor: "bg-sky-500",
    label: "Price Divergence",
  },
  flow_signal: {
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/10",
    borderColor: "border-rose-100 dark:border-rose-900/30",
    dotColor: "bg-rose-500",
    label: "Flow Signal",
  },
  linked_outcomes: {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/10",
    borderColor: "border-amber-100 dark:border-amber-900/30",
    dotColor: "bg-amber-500",
    label: "Linked Outcomes",
  },
};

export type SignalCardProps = {
  // Core data
  marketId: string;
  marketName: string;
  signalType: SignalType;
  confidence: number; // 0-100
  hook: string; // One-line intrigue text

  // Optional metadata
  category?: string;
  updatedAt?: string;

  // Evidence indicators
  volatility?: "low" | "medium" | "high";
  liquidityScore?: number; // 0-100

  // Expandable content
  enablesPoints?: string[];
  watchPoints?: string[];
  commonMistake?: string;

  // Variants
  variant?: "default" | "compact" | "summary";
};

// Format time ago
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function SignalCard({
  marketId,
  marketName,
  signalType,
  confidence,
  hook,
  category,
  updatedAt,
  volatility = "medium",
  liquidityScore = 50,
  enablesPoints,
  watchPoints,
  commonMistake,
  variant = "default",
}: SignalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = SIGNAL_CONFIGS[signalType];
  const hasExpandableContent = enablesPoints?.length || watchPoints?.length || commonMistake;

  if (variant === "compact") {
    return (
      <Link
        href={`/markets/${marketId}`}
        className="group block bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${config.dotColor} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {marketName}
            </p>
            <p className={`text-xs ${config.color}`}>{config.label}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-10 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.dotColor} rounded-full`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{confidence}%</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "summary") {
    return (
      <div className={`rounded-xl p-4 ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
            {config.label}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {marketName}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{hook}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* 1) HEADER */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug line-clamp-2">
            {marketName}
          </h3>
          {updatedAt && (
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {timeAgo(updatedAt)}
            </span>
          )}
        </div>
        {category && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{category}</span>
        )}
      </div>

      {/* 2) SIGNAL ROW */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.dotColor} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8">
              {confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* 3) ONE-LINE HOOK */}
      <div className="px-5 pb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {hook}
        </p>
      </div>

      {/* 4) EVIDENCE PREVIEW */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex-1">
            <MiniSparkline
              marketId={marketId}
              height={36}
              color={signalType === "low_friction" ? "green" : signalType === "high_friction" ? "red" : "blue"}
            />
          </div>
          <div className="flex flex-col gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
            <VolatilityIndicator level={volatility} />
            <LiquidityBar value={liquidityScore} label="Depth" />
          </div>
        </div>
      </div>

      {/* 5) EXPANDABLE SECTION */}
      {hasExpandableContent && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Signal Context
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExpanded && (
            <div className="px-5 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* What this enables */}
              {enablesPoints && enablesPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What this enables
                  </h4>
                  <ul className="space-y-1">
                    {enablesPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className={`mt-1 ${config.color}`}>+</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What to watch for */}
              {watchPoints && watchPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What to watch for
                  </h4>
                  <ul className="space-y-1">
                    {watchPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-gray-400 mt-1">→</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common mistake */}
              {commonMistake && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                    {commonMistake}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6) CTA */}
      <Link
        href={`/markets/${marketId}`}
        className="block px-5 py-4 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {category || "Market"}
          </span>
          <span className={`text-xs font-medium ${config.color} flex items-center gap-1 group-hover:gap-2 transition-all`}>
            View signal context
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
    </div>
  );
}

// Signal Card for Market Detail page - summary version
export function SignalSummaryCard({
  signalType,
  confidence,
  hook,
  enablesPoints,
  watchPoints,
}: Omit<SignalCardProps, "marketId" | "marketName">) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = SIGNAL_CONFIGS[signalType];
  const hasExpandableContent = enablesPoints?.length || watchPoints?.length;

  return (
    <div className={`rounded-2xl ${config.bgColor} border ${config.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
            <span className={`text-sm font-semibold ${config.color}`}>
              Signal: {config.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 bg-white/50 dark:bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.dotColor} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${config.color}`}>{confidence}%</span>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {hook}
        </p>
      </div>

      {/* Expandable Context */}
      {hasExpandableContent && (
        <div className="border-t border-inherit">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors"
          >
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {isExpanded ? "Hide context" : "Show full context"}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={`grid transition-all duration-300 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
              <div className="px-5 pb-4 space-y-3">
              {enablesPoints && enablesPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What this enables
                  </h4>
                  <ul className="space-y-1">
                    {enablesPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className={`mt-0.5 ${config.color}`}>+</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {watchPoints && watchPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What to watch
                  </h4>
                  <ul className="space-y-1">
                    {watchPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-gray-500 mt-0.5">→</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
