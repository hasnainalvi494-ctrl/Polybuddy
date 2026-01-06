"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDailyAttention, type DailyAttentionResponse } from "@/lib/api";

function formatVolume(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function AttentionCard({ market }: { market: DailyAttentionResponse["worthAttention"][0] }) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-300 dark:hover:border-green-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2">
          {market.question}
        </h3>
        <span className="shrink-0 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
          {market.confidence}%
        </span>
      </div>

      {/* Setup Label */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {market.setupLabel}
        </span>
      </div>

      {/* Why Bullets */}
      <ul className="space-y-1 mb-3">
        {market.whyBullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              {bullet.text}: <span className="font-medium text-gray-900 dark:text-gray-200">{bullet.value}{bullet.unit}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Why This Matters */}
      <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-700 dark:text-gray-300">
        <span className="font-medium">Why this matters:</span> {market.whyThisMatters}
      </div>
    </Link>
  );
}

function TrapCard({ market }: { market: DailyAttentionResponse["retailTraps"][0] }) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="block bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-4 hover:border-red-300 dark:hover:border-red-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2">
          {market.question}
        </h3>
        <span className="shrink-0 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
          Avoid
        </span>
      </div>

      {/* Warning Label */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {market.warningLabel}
        </span>
      </div>

      {/* Common Mistake */}
      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
        <span className="font-medium text-amber-800 dark:text-amber-400">Common mistake:</span>
        <span className="text-amber-700 dark:text-amber-300 ml-1">{market.commonMistake}</span>
      </div>
    </Link>
  );
}

function ChangeCard({ change }: { change: DailyAttentionResponse["whatChanged"][0] }) {
  const typeStyles = {
    state_shift: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
    event_window: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
    mispricing: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  };

  const style = typeStyles[change.changeType] || typeStyles.state_shift;

  return (
    <Link
      href={`/markets/${change.marketId}`}
      className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 p-2 rounded-lg ${style.bg}`}>
          <svg className={`w-4 h-4 ${style.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
            {change.question}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {change.description}
          </p>
          <span className={`inline-block px-2 py-0.5 text-xs rounded ${style.bg} ${style.text}`}>
            {change.changeType.replace("_", " ")}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DailyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dailyAttention"],
    queryFn: getDailyAttention,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading daily briefing...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading daily briefing: {(error as Error).message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Daily Attention
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            What to look at today, what to avoid, and what changed since yesterday.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Updated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "Now"}
          </p>
        </header>

        {/* Section A: Markets Worth Attention */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Markets Worth Attention Today
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Favorable structural conditions for retail participation
              </p>
            </div>
          </div>

          {data?.worthAttention && data.worthAttention.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.worthAttention.map((market) => (
                <AttentionCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              No favorable setups identified today. Check back tomorrow.
            </div>
          )}
        </section>

        {/* Section B: Retail Traps */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Retail Traps Today
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Markets with unfavorable conditions — proceed with caution
              </p>
            </div>
          </div>

          {data?.retailTraps && data.retailTraps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.retailTraps.map((market) => (
                <TrapCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              No obvious traps identified today.
            </div>
          )}
        </section>

        {/* Section C: What Changed */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                What Changed Since Yesterday
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Market state shifts, new event windows, and emerging opportunities
              </p>
            </div>
          </div>

          {data?.whatChanged && data.whatChanged.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.whatChanged.map((change, i) => (
                <ChangeCard key={i} change={change} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              No significant changes since yesterday.
            </div>
          )}
        </section>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-1">Disclaimer</p>
          <p>
            This is analysis only, not financial advice. Poly Buddy identifies structural conditions
            but does not predict outcomes. Past patterns do not guarantee future results.
            Always do your own research before making any decisions.
          </p>
        </div>
      </div>
    </main>
  );
}
