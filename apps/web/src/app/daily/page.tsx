"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDailyAttention, type DailyAttentionResponse } from "@/lib/api";
import { MiniSparkline, LiquidityBar, VolatilityIndicator } from "@/components/MiniSparkline";

// Outcome-oriented language mapping
const OUTCOME_LANGUAGE: Record<string, string> = {
  // Original structural language → Outcome language
  "Lower friction means more of your edge translates to profit.":
    "You keep more of your gains here — execution costs won't eat your edge.",
  "Price divergence from related markets creates opportunity.":
    "Similar markets are priced differently — patient entry may pay off.",
  "Defined timeline helps manage position sizing and exit planning.":
    "You know exactly when this resolves — easier to plan your exit.",
  "Market structure doesn't systematically disadvantage smaller participants.":
    "The playing field is more level here — big traders don't have as much advantage.",
  "Favorable conditions for retail participation.":
    "You have a fair shot here — structure favors patient decision-making.",
  "Rare: Flow signals in this market may benefit patient retail traders.":
    "Unusual: Fast traders aren't dominating — you have time to think.",
};

function getOutcomeLanguage(original: string): string {
  return OUTCOME_LANGUAGE[original] || original;
}

// Detect if same underlying asset appears in both sections
function findContrastMarkets(
  worthAttention: DailyAttentionResponse["worthAttention"],
  retailTraps: DailyAttentionResponse["retailTraps"]
): Set<string> {
  const worthQuestions = new Set(worthAttention.map(m => extractAsset(m.question)));
  const trapQuestions = new Set(retailTraps.map(m => extractAsset(m.question)));
  const overlap = new Set<string>();
  worthQuestions.forEach(q => {
    if (trapQuestions.has(q)) overlap.add(q);
  });
  return overlap;
}

function extractAsset(question: string): string {
  // Extract key asset/topic from question for comparison
  const keywords = ["Bitcoin", "Ethereum", "Trump", "Biden", "Fed", "inflation", "election"];
  for (const kw of keywords) {
    if (question.toLowerCase().includes(kw.toLowerCase())) return kw;
  }
  // Return first few significant words
  return question.split(" ").slice(0, 3).join(" ").toLowerCase();
}

function AttentionCard({
  market,
  hasContrastTrap
}: {
  market: DailyAttentionResponse["worthAttention"][0];
  hasContrastTrap?: boolean;
}) {
  // Estimate volatility from confidence (simplified)
  const volatility: "low" | "medium" | "high" =
    market.confidence > 75 ? "low" : market.confidence > 50 ? "medium" : "high";

  return (
    <Link
      href={`/markets/${market.id}`}
      className="group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2">
          {market.question}
        </h3>
        <span className="shrink-0 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
          {market.confidence}% match
        </span>
      </div>

      {/* Visual Evidence Preview */}
      <div className="flex items-center gap-3 mb-3 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">24h Price</div>
          <MiniSparkline marketId={market.id} height={28} color="green" />
        </div>
        <div className="flex flex-col gap-1.5">
          <VolatilityIndicator level={volatility} />
          <LiquidityBar value={market.confidence} label="Depth" />
        </div>
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
            <span className="text-green-500 mt-0.5">•</span>
            <span>
              {bullet.text}: <span className="font-medium text-gray-900 dark:text-gray-200">{bullet.value}{bullet.unit}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Why This Matters - Outcome Language */}
      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-800 dark:text-green-300 mb-3">
        <span className="font-medium">What this means for you:</span>{" "}
        {getOutcomeLanguage(market.whyThisMatters)}
      </div>

      {/* Contrast Note */}
      {hasContrastTrap && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 mb-3">
          <span className="font-medium">Note:</span> A similar market appears in Retail Traps — this version has better structure for retail.
        </div>
      )}

      {/* Explicit CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {market.category || "Market"}
        </span>
        <span className="text-xs font-medium text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 flex items-center gap-1">
          See why this setup works
          <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function TrapCard({
  market,
  hasContrastGood
}: {
  market: DailyAttentionResponse["retailTraps"][0];
  hasContrastGood?: boolean;
}) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="group block bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-4 hover:border-red-400 dark:hover:border-red-600 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2">
          {market.question}
        </h3>
        <span className="shrink-0 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
          Caution
        </span>
      </div>

      {/* Visual Evidence Preview */}
      <div className="flex items-center gap-3 mb-3 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">24h Price</div>
          <MiniSparkline marketId={market.id} height={28} color="red" />
        </div>
        <div className="flex flex-col gap-1.5">
          <VolatilityIndicator level="high" />
          <LiquidityBar value={30} label="Depth" />
        </div>
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

      {/* Common Mistake - Outcome Language */}
      <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs mb-3">
        <span className="font-medium text-red-800 dark:text-red-400">Why retail loses here:</span>
        <span className="text-red-700 dark:text-red-300 ml-1">{market.commonMistake}</span>
      </div>

      {/* Contrast Note */}
      {hasContrastGood && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-800 dark:text-green-300 mb-3">
          <span className="font-medium">Same asset, different structure:</span> Check "Worth Attention" for a version with better retail conditions.
        </div>
      )}

      {/* Explicit CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {market.category || "Market"}
        </span>
        <span className="text-xs font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 flex items-center gap-1">
          Understand the risks
          <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function ChangeCard({ change }: { change: DailyAttentionResponse["whatChanged"][0] }) {
  const typeConfig: Record<string, { bg: string; text: string; icon: string; cta: string }> = {
    state_shift: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-400",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
      cta: "See what changed"
    },
    event_window: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      cta: "View timeline"
    },
    mispricing: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      cta: "Analyze spread"
    },
    flow_guard: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      cta: "Review flow"
    },
  };

  const config = typeConfig[change.changeType] || typeConfig.state_shift;

  return (
    <Link
      href={`/markets/${change.marketId}`}
      className="group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`shrink-0 p-2 rounded-lg ${config.bg}`}>
          <svg className={`w-4 h-4 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {/* Question */}
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
            {change.question}
          </p>

          {/* Description */}
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {change.description}
          </p>

          {/* Mini Sparkline */}
          <div className="mb-3">
            <MiniSparkline marketId={change.marketId} height={24} color="purple" />
          </div>

          {/* Type Badge + CTA */}
          <div className="flex items-center justify-between">
            <span className={`inline-block px-2 py-0.5 text-xs rounded ${config.bg} ${config.text}`}>
              {change.changeType.replace(/_/g, " ")}
            </span>
            <span className={`text-xs font-medium ${config.text} group-hover:opacity-80 flex items-center gap-1`}>
              {config.cta}
              <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
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

  // Find overlapping assets for contrast
  const contrastAssets = data
    ? findContrastMarkets(data.worthAttention, data.retailTraps)
    : new Set<string>();

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading your morning brief...</p>
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

  const totalMarkets = (data?.worthAttention?.length || 0) + (data?.retailTraps?.length || 0) + (data?.whatChanged?.length || 0);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Your Daily Brief
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {totalMarkets} markets need your attention today
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : "just now"}
              </p>
            </div>
          </div>

          {/* Quick Summary Bar */}
          <div className="mt-4 flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{data?.worthAttention?.length || 0}</span> favorable
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{data?.retailTraps?.length || 0}</span> to avoid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{data?.whatChanged?.length || 0}</span> changed
              </span>
            </div>
          </div>
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
                Worth Your Attention
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Markets where you have a fair shot — structure favors patient decisions
              </p>
            </div>
          </div>

          {data?.worthAttention && data.worthAttention.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.worthAttention.map((market) => (
                <AttentionCard
                  key={market.id}
                  market={market}
                  hasContrastTrap={contrastAssets.has(extractAsset(market.question))}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              <p className="mb-2">No favorable setups identified today.</p>
              <p className="text-xs">This is normal — good setups are rare by design.</p>
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
                Skip These Today
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Markets where retail typically loses — structure favors faster traders
              </p>
            </div>
          </div>

          {data?.retailTraps && data.retailTraps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.retailTraps.map((market) => (
                <TrapCard
                  key={market.id}
                  market={market}
                  hasContrastGood={contrastAssets.has(extractAsset(market.question))}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              <p>No obvious traps identified today.</p>
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
                What Changed Overnight
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Markets that moved or have new conditions since yesterday
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
              <p>No significant changes since yesterday.</p>
            </div>
          )}
        </section>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-1">Remember</p>
          <p>
            This brief identifies structural conditions, not outcomes. Markets can still move against you
            even in favorable structures. Use this to filter what deserves deeper research, not as a signal to act.
          </p>
        </div>
      </div>
    </main>
  );
}
