"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getSignals,
  checkSignalsAvailability,
  type Signal,
  type SignalType,
  type SignalStrength,
} from "@/lib/api";
import { useState } from "react";

const SIGNAL_TYPE_INFO: Record<
  SignalType,
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  momentum: {
    label: "Momentum",
    description: "Strong price movement with volume confirmation",
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  contrarian: {
    label: "Contrarian",
    description: "Extreme pricing that may revert",
    color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  liquidity_opportunity: {
    label: "Liquidity",
    description: "Wide spreads create limit order opportunities",
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  value_gap: {
    label: "Value Gap",
    description: "Mispricing relative to related markets",
    color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  event_catalyst: {
    label: "Event",
    description: "Resolution approaching with opportunity",
    color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const STRENGTH_STYLES: Record<SignalStrength, { label: string; color: string }> = {
  weak: { label: "Weak", color: "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700" },
  moderate: { label: "Moderate", color: "text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30" },
  strong: { label: "Strong", color: "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30" },
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimeUntil(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / (24 * 3600000));

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = SIGNAL_TYPE_INFO[signal.type];
  const strengthInfo = STRENGTH_STYLES[signal.strength];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
              {typeInfo.icon}
            </div>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${strengthInfo.color}`}>
                {strengthInfo.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                signal.direction === "bullish"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {signal.direction === "bullish" ? "BULLISH" : "BEARISH"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {signal.confidence}% conf
            </span>
          </div>
        </div>

        <Link
          href={`/markets/${signal.marketId}`}
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
        >
          {signal.marketQuestion}
        </Link>

        {/* Price Info */}
        <div className="flex items-center gap-4 mt-3">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Current</span>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {(signal.currentPrice * 100).toFixed(0)}%
            </p>
          </div>
          {signal.targetPrice && (
            <>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Target</span>
                <p
                  className={`text-lg font-bold ${
                    signal.direction === "bullish"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {(signal.targetPrice * 100).toFixed(0)}%
                </p>
              </div>
            </>
          )}
          <div className="ml-auto text-right">
            <span className="text-xs text-gray-500 dark:text-gray-400">Time Horizon</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {signal.timeHorizon}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span>{expanded ? "Hide details" : "Show reasoning & risks"}</span>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Reasoning
              </h4>
              <ul className="space-y-1">
                {signal.reasoning.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5">+</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Risks
              </h4>
              <ul className="space-y-1">
                {signal.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-red-500 mt-0.5">!</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Created {formatTime(signal.createdAt)}</span>
        <span>Expires in {formatTimeUntil(signal.expiresAt)}</span>
      </div>
    </div>
  );
}

function UnavailableMessage({ reason }: { reason: string }) {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 text-amber-600 dark:text-amber-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-amber-800 dark:text-amber-400 mb-2">
            Signals Not Available
          </h1>
          <p className="text-amber-700 dark:text-amber-300 mb-6">{reason}</p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Browse Markets Instead
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SignalsPage() {
  const [typeFilter, setTypeFilter] = useState<SignalType | "all">("all");
  const [strengthFilter, setStrengthFilter] = useState<SignalStrength | "all">("all");

  const {
    data: availability,
    isLoading: checkingAvailability,
    error: availabilityError,
  } = useQuery({
    queryKey: ["signalsAvailability"],
    queryFn: checkSignalsAvailability,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: signalsData,
    isLoading: loadingSignals,
    error: signalsError,
    refetch,
  } = useQuery({
    queryKey: ["signals", typeFilter, strengthFilter],
    queryFn: () =>
      getSignals({
        type: typeFilter === "all" ? undefined : typeFilter,
        minStrength: strengthFilter === "all" ? undefined : strengthFilter,
        limit: 30,
      }),
    enabled: availability?.available === true,
    staleTime: 2 * 60 * 1000,
  });

  if (checkingAvailability) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Checking availability...</p>
          </div>
        </div>
      </main>
    );
  }

  if (availabilityError) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error checking availability. Please try again later.
          </div>
        </div>
      </main>
    );
  }

  if (!availability?.available) {
    return (
      <UnavailableMessage
        reason={
          availability?.reason ||
          "This feature is not available in your region."
        }
      />
    );
  }

  const isLoading = loadingSignals;
  const signals = signalsData?.signals || [];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Trading Signals
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Algorithmic signals based on market data analysis
              </p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Signal Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as SignalType | "all")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Types</option>
              <option value="momentum">Momentum</option>
              <option value="contrarian">Contrarian</option>
              <option value="liquidity_opportunity">Liquidity</option>
              <option value="value_gap">Value Gap</option>
              <option value="event_catalyst">Event</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Min Strength
            </label>
            <select
              value={strengthFilter}
              onChange={(e) => setStrengthFilter(e.target.value as SignalStrength | "all")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Any Strength</option>
              <option value="weak">Weak+</option>
              <option value="moderate">Moderate+</option>
              <option value="strong">Strong Only</option>
            </select>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {signalsData?.disclaimer ||
                "Signals are for informational purposes only and do not constitute financial advice."}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading signals...</p>
          </div>
        )}

        {/* Error State */}
        {signalsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading signals: {(signalsError as Error).message}
          </div>
        )}

        {/* Signals List */}
        {!isLoading && !signalsError && (
          <>
            {signals.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                  No Signals Found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No trading signals match your current filters. Try adjusting the filters or check back later.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {signals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        {signalsData && (
          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Last updated: {formatTime(signalsData.generatedAt)}
          </div>
        )}
      </div>
    </main>
  );
}
