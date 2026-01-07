"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDailyAttention, type DailyAttentionResponse } from "@/lib/api";
import { MiniSparkline, LiquidityBar, VolatilityIndicator } from "@/components/MiniSparkline";
import { HiddenExposureInlineWarning } from "@/components/HiddenExposureWarning";
import { PremiumUpgradeModal, usePremiumUpgrade, usePremiumStatus } from "@/components/PremiumUpgradeModal";

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20">
        {/* Surface name */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-950" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Pulse</span>
            <span className="text-xs text-gray-600 ml-2">PolyBuddy's live signal surface</span>
          </div>
        </div>

        {/* Primary headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-100 tracking-tight mb-6 max-w-3xl leading-[1.1]">
          See market structure before price moves.
        </h1>

        {/* One-sentence explainer */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Live structural signals across prediction markets that show where retail traders can compete — and where hidden risks quietly punish late or crowded entries.
        </p>

        {/* Value bullets */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-100">Identify retail-friendly setups</h3>
            </div>
            <p className="text-sm text-gray-500 pl-3.5">
              See when structure allows patient positioning without execution penalty.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-100">Avoid hidden exposure</h3>
            </div>
            <p className="text-sm text-gray-500 pl-3.5">
              Detect when different markets are effectively the same bet.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-100">Read flow dynamics</h3>
            </div>
            <p className="text-sm text-gray-500 pl-3.5">
              Understand whether market structure helps or hurts retail.
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-4 mb-12">
          <a
            href="#signals"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-gray-950 font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            View live signals
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-gray-200 font-semibold rounded-xl hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Explore markets
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Trust line */}
        <p className="text-xs text-gray-600 max-w-lg">
          Pulse provides analysis only. It does not predict outcomes or execute trades.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// SIGNAL CARDS
// ============================================================================

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

// Confidence level helper
function getConfidenceLevel(confidence: number): { label: string; color: string } {
  if (confidence >= 75) return { label: "High", color: "emerald" };
  if (confidence >= 50) return { label: "Medium", color: "amber" };
  return { label: "Low", color: "gray" };
}

// Generate outcome-oriented insight
function getActiveInsight(market: DailyAttentionResponse["worthAttention"][0]): string {
  const insights = [
    "Structure favors patient positioning before crowding develops.",
    "Flow patterns suggest retail-friendly conditions persist.",
    "Professional activity has stabilized — structure now favors deliberate entries.",
    "Spreads remain tight relative to attention — execution costs stay low.",
    "Early structural shift detected — positioning window still open.",
  ];
  // Use market id hash for consistent but varied insights
  const idx = market.id.charCodeAt(0) % insights.length;
  return market.whyThisMatters || insights[idx];
}

function ActiveSignalCard({
  market,
  index,
  isPremium,
  onUpgradeClick,
}: {
  market: DailyAttentionResponse["worthAttention"][0];
  index: number;
  isPremium: boolean;
  onUpgradeClick: () => void;
}) {
  const confidence = getConfidenceLevel(market.confidence);
  const volatility: "low" | "medium" | "high" =
    market.confidence > 75 ? "low" : market.confidence > 50 ? "medium" : "high";

  return (
    <div
      className="group/card bg-gray-900/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-800/60 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      {/* Card Header */}
      <div className="p-5 pb-0">
        {/* Top row: Badge + Category */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Retail-Friendly
            </span>
          </div>
          <span className="text-xs text-gray-600">
            {market.category || "Market"}
          </span>
        </div>

        {/* Market name - Primary */}
        <h3 className="font-semibold text-gray-100 text-base leading-snug mb-3 line-clamp-2 group-hover/card:text-white transition-colors">
          {market.question}
        </h3>

        {/* Signal Confidence Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Signal confidence</span>
            <span className={`text-xs font-medium ${confidence.color === 'emerald' ? 'text-emerald-400' : confidence.color === 'amber' ? 'text-amber-400' : 'text-gray-400'}`}>
              {confidence.label}
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${confidence.color === 'emerald' ? 'bg-emerald-500' : confidence.color === 'amber' ? 'bg-amber-500' : 'bg-gray-500'}`}
              style={{
                width: `${market.confidence}%`,
                animation: 'expand-width 1s ease-out forwards',
                animationDelay: `${index * 80 + 200}ms`
              }}
            />
          </div>
        </div>

        {/* Primary Insight - Why this is interesting now */}
        <div className="mb-4">
          <p className="text-xs font-medium text-emerald-400/80 mb-1">Why this is interesting now</p>
          <p className="text-sm text-gray-300 leading-relaxed">
            {getActiveInsight(market)}
          </p>
        </div>

        {/* Visual Preview - Subtle motion indicator */}
        <div className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-xl mb-4 border border-gray-700/30">
          <div className="flex-1 opacity-80 group-hover/card:opacity-100 transition-opacity">
            <MiniSparkline marketId={market.id} height={28} color="green" />
          </div>
          <div className="flex items-center gap-3 pl-3 border-l border-gray-700/50">
            <div className="flex flex-col items-center">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${i <= Math.ceil(market.confidence / 20) ? 'bg-emerald-500/70 h-3' : 'bg-gray-700 h-2'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-600 mt-1">Depth</span>
            </div>
          </div>
        </div>

        {/* Signal Label */}
        <div className="flex items-center gap-2 flex-wrap pb-4">
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg font-medium border border-emerald-500/20">
            {market.setupLabel || "Favorable Structure"}
          </span>
          <HiddenExposureInlineWarning marketId={market.id} />
        </div>
      </div>

      {/* Depth-based paywall - Free users */}
      {!isPremium && (
        <div className="border-t border-gray-800/60">
          <button
            onClick={(e) => { e.preventDefault(); onUpgradeClick(); }}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-emerald-500/5 transition-all duration-200 group/unlock"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center group-hover/unlock:border-emerald-500/40 transition-colors">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200 group-hover/unlock:text-white transition-colors">Unlock full signal context</p>
                <p className="text-xs text-gray-500">See what retail traders typically miss here</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-500 opacity-0 group-hover/unlock:opacity-100 transition-opacity">Unlock</span>
              <svg className="w-4 h-4 text-emerald-500/60 group-hover/unlock:text-emerald-400 group-hover/unlock:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Premium users see full context */}
      {isPremium && (
        <div className="px-5 py-4 border-t border-gray-800/60 space-y-3 bg-emerald-500/5">
          <div>
            <h4 className="text-xs font-medium text-emerald-400/70 mb-1">What this often leads to</h4>
            <p className="text-xs text-gray-300 leading-relaxed">Patient positioning here tends to result in better execution than reactive entries after momentum builds.</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">What to watch</h4>
            <p className="text-xs text-gray-400 leading-relaxed">This setup typically degrades when attention spikes or spreads widen suddenly.</p>
          </div>
        </div>
      )}

      {/* CTA Footer */}
      <Link
        href={`/markets/${market.id}`}
        className="block px-5 py-3 border-t border-gray-800/40 hover:bg-gray-800/30 transition-all duration-200 group/cta"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">See full context</span>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 group-hover/cta:gap-2.5 transition-all">
            View market details
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
    </div>
  );
}

// Generate outcome-oriented friction insight
function getFrictionInsight(market: DailyAttentionResponse["retailTraps"][0]): string {
  const insights = [
    "Late positioning here typically faces widened spreads and poor execution.",
    "Retail entries at this stage often coincide with peak attention costs.",
    "Crowded positioning tends to compress returns and amplify exit friction.",
    "Structure has shifted — early movers already captured favorable conditions.",
    "High attention periods like this historically punish reactive entries.",
  ];
  const idx = market.id.charCodeAt(0) % insights.length;
  return market.commonMistake || insights[idx];
}

function HighFrictionSignalCard({
  market,
  isPremium,
  onUpgradeClick,
}: {
  market: DailyAttentionResponse["retailTraps"][0];
  isPremium: boolean;
  onUpgradeClick: () => void;
}) {
  return (
    <div className="group/card bg-gray-900/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-800/40 hover:border-amber-500/30 transition-all duration-300 opacity-90 hover:opacity-100">
      {/* Caution indicator stripe */}
      <div className="h-0.5 bg-gradient-to-r from-amber-500/60 via-rose-500/40 to-transparent" />

      {/* Card Header */}
      <div className="p-5 pb-0">
        {/* Top row: Badge + Category */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-amber-500/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500/80">
              High Friction
            </span>
          </div>
          <span className="text-xs text-gray-600">
            {market.category || "Market"}
          </span>
        </div>

        {/* Market name - Primary (muted compared to Active) */}
        <h3 className="font-semibold text-gray-300 text-base leading-snug mb-3 line-clamp-2 group-hover/card:text-gray-200 transition-colors">
          {market.question}
        </h3>

        {/* Common retail mistake - Always visible */}
        <div className="mb-4 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
          <p className="text-xs font-medium text-amber-500/70 mb-1 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Common retail mistake
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            {getFrictionInsight(market)}
          </p>
        </div>

        {/* Visual Preview - Muted, showing volatility */}
        <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl mb-4 border border-gray-700/20">
          <div className="flex-1 opacity-60 group-hover/card:opacity-80 transition-opacity">
            <MiniSparkline marketId={market.id} height={28} color="red" />
          </div>
          <div className="flex items-center gap-3 pl-3 border-l border-gray-700/30">
            <div className="flex flex-col items-center">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${i <= 2 ? 'bg-amber-500/50 h-2' : 'bg-gray-700/50 h-2'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-600 mt-1">Depth</span>
            </div>
          </div>
        </div>

        {/* Signal Label */}
        <div className="flex items-center gap-2 flex-wrap pb-4">
          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500/70 text-xs rounded-lg font-medium border border-amber-500/15">
            {market.warningLabel || "Structural Headwind"}
          </span>
          <HiddenExposureInlineWarning marketId={market.id} />
        </div>
      </div>

      {/* Depth-based paywall - Free users */}
      {!isPremium && (
        <div className="border-t border-gray-800/40">
          <button
            onClick={(e) => { e.preventDefault(); onUpgradeClick(); }}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-800/20 transition-all duration-200 group/unlock"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700/30 to-gray-800/20 border border-gray-700/30 flex items-center justify-center group-hover/unlock:border-gray-600/50 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300 group-hover/unlock:text-gray-200 transition-colors">Unlock full signal context</p>
                <p className="text-xs text-gray-600">See why this signal fired and what to watch</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 opacity-0 group-hover/unlock:opacity-100 transition-opacity">Unlock</span>
              <svg className="w-4 h-4 text-gray-600 group-hover/unlock:text-gray-500 group-hover/unlock:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Premium users see full context */}
      {isPremium && (
        <div className="px-5 py-4 border-t border-gray-800/40 space-y-3 bg-gray-800/20">
          <div>
            <h4 className="text-xs font-medium text-amber-500/60 mb-1">What this often leads to</h4>
            <p className="text-xs text-gray-400 leading-relaxed">Retail entries during high-friction periods tend to face immediate execution drag and elevated exit costs.</p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">What to watch</h4>
            <p className="text-xs text-gray-500 leading-relaxed">This friction typically eases when attention fades and spreads normalize — usually days after peak interest.</p>
          </div>
        </div>
      )}

      {/* CTA Footer */}
      <Link
        href={`/markets/${market.id}`}
        className="block px-5 py-3 border-t border-gray-800/30 hover:bg-gray-800/20 transition-all duration-200 group/cta"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">See full context</span>
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5 group-hover/cta:gap-2.5 group-hover/cta:text-gray-400 transition-all">
            Understand structure
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
    </div>
  );
}

function SignalTimelineRow({ change, index }: { change: DailyAttentionResponse["whatChanged"][0]; index: number }) {
  const typeConfig: Record<string, { color: string; label: string; description: string }> = {
    state_shift: { color: "violet", label: "State Shift", description: "Structure changed recently" },
    event_window: { color: "amber", label: "Event Window", description: "Time-sensitive conditions" },
    mispricing: { color: "sky", label: "Exposure Link", description: "Related market detected" },
    flow_guard: { color: "rose", label: "Flow Guard", description: "Flow pattern warning" },
  };

  const config = typeConfig[change.changeType] || typeConfig.state_shift;
  const colorClasses: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", dot: "bg-violet-500" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
    sky: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20", dot: "bg-sky-500" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-500" },
  };
  const colors = colorClasses[config.color];

  return (
    <Link
      href={`/markets/${change.marketId}`}
      className="group flex items-center gap-4 p-4 bg-gray-900/40 rounded-xl hover:bg-gray-900/60 transition-all duration-200 border border-gray-800/30 hover:border-gray-700/50 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
    >
      {/* Timeline dot */}
      <div className="relative shrink-0">
        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
        {index > 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-px h-4 bg-gray-800" />
        )}
      </div>

      {/* Label chip */}
      <span className={`shrink-0 px-2.5 py-1 text-xs rounded-lg font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
        {config.label}
      </span>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate group-hover:text-gray-200 transition-colors">{change.question}</p>
        <p className="text-xs text-gray-600 truncate">{change.description || config.description}</p>
      </div>

      {/* Time indicator */}
      <span className="shrink-0 text-xs text-gray-600 hidden sm:block">
        Recent
      </span>

      {/* Arrow */}
      <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PulsePage() {
  const { isPremium } = usePremiumStatus();
  const { isOpen, openUpgrade, closeUpgrade } = usePremiumUpgrade();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dailyAttention"],
    queryFn: getDailyAttention,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero */}
      <HeroSection />

      {/* Signal Sections */}
      <div id="signals" className="max-w-6xl mx-auto px-6 pb-16">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-emerald-500"></div>
            <p className="mt-4 text-sm text-gray-500">Loading signals...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-400">
            Unable to load signals. Please refresh.
          </div>
        ) : (
          <>
            {/* Section A: Active Signals */}
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <div className="w-1.5 h-10 bg-emerald-500 rounded-full" />
                  <div className="absolute inset-0 w-1.5 h-10 bg-emerald-500 rounded-full animate-pulse opacity-50" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 tracking-tight">
                    Active Signals
                  </h2>
                  <p className="text-sm text-gray-500">
                    Retail-friendly structure detected — positioning windows open
                  </p>
                </div>
              </div>

              {data?.worthAttention && data.worthAttention.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.worthAttention.slice(0, 6).map((market, index) => (
                    <ActiveSignalCard
                      key={market.id}
                      market={market}
                      index={index}
                      isPremium={isPremium}
                      onUpgradeClick={openUpgrade}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800/50">
                  <p className="text-gray-400">No active signals detected.</p>
                  <p className="text-xs text-gray-600 mt-1">Quality signals are rare by design.</p>
                </div>
              )}
            </section>

            {/* Section B: High Friction Signals */}
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-10 bg-gradient-to-b from-amber-500 to-rose-500/60 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 tracking-tight">
                    High Friction Signals
                  </h2>
                  <p className="text-sm text-gray-500">
                    Structural headwinds detected — late entries typically penalized
                  </p>
                </div>
              </div>

              {data?.retailTraps && data.retailTraps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.retailTraps.slice(0, 6).map((market) => (
                    <HighFrictionSignalCard
                      key={market.id}
                      market={market}
                      isPremium={isPremium}
                      onUpgradeClick={openUpgrade}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800/50">
                  <p className="text-gray-400">No high-friction signals detected.</p>
                </div>
              )}
            </section>

            {/* Section C: Signal Timeline */}
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-10 bg-violet-500 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 tracking-tight">
                    Signal Timeline
                  </h2>
                  <p className="text-sm text-gray-500">
                    Recent state changes and emerging structural shifts
                  </p>
                </div>
              </div>

              {data?.whatChanged && data.whatChanged.length > 0 ? (
                <div className="space-y-2">
                  {data.whatChanged.slice(0, 8).map((change, i) => (
                    <SignalTimelineRow key={i} change={change} index={i} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800/50">
                  <p className="text-gray-400">No recent signal changes.</p>
                </div>
              )}
            </section>

            {/* Premium Promotion - Free Users Only */}
            {!isPremium && (
              <section className="mb-16">
                <button
                  onClick={openUpgrade}
                  className="w-full relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/30 border border-emerald-500/20 rounded-2xl p-8 text-left hover:border-emerald-500/40 transition-all duration-300 group"
                >
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
                        <svg className="w-7 h-7 text-gray-950" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-100 mb-1.5 tracking-tight">
                          Unlock full signal context
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                          See why signals fire, what usually goes wrong for retail, and what conditions typically change the setup.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-emerald-400 hidden sm:block group-hover:text-emerald-300 transition-colors">Unlock</span>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all">
                        <svg className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              </section>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-gray-800">
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            PolyBuddy provides structural analysis only. Signals reflect market conditions, not predictions.
            Not financial advice. Not a trading service.
          </p>
        </footer>
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal isOpen={isOpen} onClose={closeUpgrade} />
    </main>
  );
}
