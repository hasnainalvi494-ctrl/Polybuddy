"use client";

export const dynamic = "force-dynamic";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDailySignals,
  checkDailySignalsAvailability,
  type DailySignalsMarket,
  type DailySignalsCrowdMarket,
  type DailySignalsEventMarket,
  type RetailSignal,
} from "@/lib/api";

function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return `${(price * 100).toFixed(0)}%`;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function SignalBadge({ signal }: { signal: RetailSignal }) {
  const colors = {
    favorable_structure: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    structural_mispricing: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    crowd_chasing: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    event_window: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    retail_friendliness: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
  };

  const labels = {
    favorable_structure: "Structure",
    structural_mispricing: "Mispricing",
    crowd_chasing: "Crowd",
    event_window: "Event",
    retail_friendliness: "Retail-Friendly",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[signal.signalType]}`}>
      {labels[signal.signalType]}
    </span>
  );
}

function FavorableMarketCard({ market }: { market: DailySignalsMarket }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link
          href={`/markets/${market.marketId}`}
          className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
        >
          {market.question}
        </Link>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100 shrink-0">
          {formatPrice(market.currentPrice)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {market.signals.map((signal) => (
          <SignalBadge key={signal.id} signal={signal} />
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {market.category && (
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
            {market.category}
          </span>
        )}
        <span>{market.signals.length} favorable signals</span>
      </div>
    </div>
  );
}

function CrowdChasingCard({ market }: { market: DailySignalsCrowdMarket }) {
  const firstBullet = market.signal.whyBullets[0];

  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          href={`/markets/${market.marketId}`}
          className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
        >
          {market.question}
        </Link>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100 shrink-0">
          {formatPrice(market.currentPrice)}
        </span>
      </div>

      <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-2">
        {market.signal.label}
      </p>

      {firstBullet && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {firstBullet.text}
        </p>
      )}
    </div>
  );
}

function EventWindowCard({ market }: { market: DailySignalsEventMarket }) {
  const isUrgent = market.hoursUntilEvent < 6;

  return (
    <div className={`border rounded-lg p-4 ${
      isUrgent
        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
        : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          href={`/markets/${market.marketId}`}
          className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
        >
          {market.question}
        </Link>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatPrice(market.currentPrice)}
          </span>
          <p className={`text-xs font-medium ${isUrgent ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
            {formatHours(market.hoursUntilEvent)} until event
          </p>
        </div>
      </div>

      <p className={`text-sm font-medium ${isUrgent ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400"}`}>
        {market.signal.label}
      </p>
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
            Daily Signals Not Available
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

export default function DailySignalsPage() {
  const {
    data: availability,
    isLoading: checkingAvailability,
    error: availabilityError,
  } = useQuery({
    queryKey: ["dailySignalsAvailability"],
    queryFn: checkDailySignalsAvailability,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: dailyData,
    isLoading: loadingSignals,
    error: signalsError,
    refetch,
  } = useQuery({
    queryKey: ["dailySignals"],
    queryFn: getDailySignals,
    enabled: availability?.available === true,
    staleTime: 5 * 60 * 1000,
  });

  if (checkingAvailability) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto">
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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/signals"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Signals
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 dark:text-gray-100">Daily</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Daily Retail Signals
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Today&apos;s market conditions for retail participation
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

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading daily signals...</p>
          </div>
        )}

        {/* Error State */}
        {signalsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading signals: {(signalsError as Error).message}
          </div>
        )}

        {/* Content */}
        {dailyData && !isLoading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Markets Analyzed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dailyData.summary.totalMarkets}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Favorable Setup</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {dailyData.summary.favorableCount}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Crowd Chasing</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {dailyData.summary.crowdChasingCount}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Event Windows</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {dailyData.summary.eventWindowCount}
                </p>
              </div>
            </div>

            {/* Favorable Markets */}
            {dailyData.favorableMarkets.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Favorable Conditions
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Markets with multiple positive signals for retail
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dailyData.favorableMarkets.map((market) => (
                    <FavorableMarketCard key={market.marketId} market={market} />
                  ))}
                </div>
              </section>
            )}

            {/* Crowd Chasing Warnings */}
            {dailyData.crowdChasingMarkets.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Crowd Chasing Detected
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Markets showing FOMO patterns — late entry risk
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dailyData.crowdChasingMarkets.map((market) => (
                    <CrowdChasingCard key={market.marketId} market={market} />
                  ))}
                </div>
              </section>
            )}

            {/* Event Windows */}
            {dailyData.eventWindowMarkets.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Approaching Events
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Markets entering repricing windows
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dailyData.eventWindowMarkets.map((market) => (
                    <EventWindowCard key={market.marketId} market={market} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {dailyData.favorableMarkets.length === 0 &&
             dailyData.crowdChasingMarkets.length === 0 &&
             dailyData.eventWindowMarkets.length === 0 && (
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
                  No Signals Today
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No notable market conditions detected. Check back later.
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                  {dailyData.disclaimer}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              Last updated: {formatTime(dailyData.generatedAt)}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
