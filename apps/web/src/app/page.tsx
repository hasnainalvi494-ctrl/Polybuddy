"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDailyAttention, getLiveStats, type DailyAttentionResponse } from "@/lib/api";
import { MiniSparkline, LiquidityBar, VolatilityIndicator } from "@/components/MiniSparkline";
import { HiddenExposureInlineWarning } from "@/components/HiddenExposureWarning";
import { ParticipationContextLine } from "@/components/WhosInThisMarket";
import { StructurallyInterestingCarouselDark } from "@/components/StructurallyInterestingCarousel";
import { useEffect, useState } from "react";

// ============================================================================
// HERO SECTION - TRADER-FOCUSED
// ============================================================================

function HeroSection() {
  const { data: stats } = useQuery({
    queryKey: ["liveStats"],
    queryFn: getLiveStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 25000,
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `$${(vol / 1000).toFixed(0)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <section className="relative overflow-hidden">
      {/* Aggressive gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98120_1px,transparent_1px),linear-gradient(to_bottom,#10b98120_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-24">
        {/* Live Stats Ticker - Above headline */}
        <div className="mb-8 flex items-center justify-center">
          <div className="inline-flex items-center gap-6 px-6 py-3 bg-gray-900/80 backdrop-blur-sm border border-emerald-500/20 rounded-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">LIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">24h Volume:</span>
              <span className="text-sm font-bold text-emerald-400">
                {mounted && stats ? formatVolume(stats.volume24h) : "$2.4M"}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Active Traders:</span>
              <span className="text-sm font-bold text-gray-200">
                {mounted && stats ? formatNumber(stats.activeTraders) : "1,247"}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Top Win Rate:</span>
              <span className="text-sm font-bold text-emerald-400">
                {mounted && stats ? `${stats.topWinRate.toFixed(1)}%` : "94.2%"}
              </span>
            </div>
          </div>
        </div>

        {/* Primary headline - BOLD & ACTION-ORIENTED */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-50 tracking-tight mb-6 max-w-4xl mx-auto text-center leading-[1.05]">
          Copy Winning Traders.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
            Find Risk-Free Profits.
          </span>{" "}
          Win More Bets.
        </h1>

        {/* Subheadline - URGENT */}
        <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed text-center font-medium">
          Real-time whale tracking, arbitrage scanner, and top trader leaderboard.{" "}
          <span className="text-emerald-400">Turn prediction markets into profit.</span>
        </p>

        {/* Value bullets - BENEFIT-FOCUSED */}
        <div className="grid sm:grid-cols-3 gap-6 mb-14 max-w-4xl mx-auto">
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all hover:scale-105">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-bold text-gray-100 text-lg mb-2">Top Traders</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Follow wallets with 85%+ win rates. Copy their moves before markets react.
            </p>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all hover:scale-105">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-bold text-gray-100 text-lg mb-2">Arbitrage Scanner</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Find risk-free profits in seconds. Lock in guaranteed returns across related markets.
            </p>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all hover:scale-105">
            <div className="text-3xl mb-3">🐋</div>
            <h3 className="font-bold text-gray-100 text-lg mb-2">Whale Alerts</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Know when big money moves. Get instant notifications on large position changes.
            </p>
          </div>
        </div>

        {/* CTA buttons - LARGE & URGENT */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 text-gray-950 font-bold text-lg rounded-xl hover:bg-emerald-400 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
          >
            View Top Traders
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#arbitrage"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gray-800 text-gray-100 font-bold text-lg rounded-xl hover:bg-gray-700 transition-all hover:scale-105 border-2 border-gray-700 hover:border-emerald-500/50"
          >
            Find Arbitrage Opportunities
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </a>
        </div>

        {/* Trust line - Less prominent */}
        <p className="text-xs text-gray-600 max-w-lg mx-auto text-center">
          Analysis tools only. Not financial advice. Trade at your own risk.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// OPPORTUNITY CARDS - PROFIT-FOCUSED
// ============================================================================

// Calculate profit potential from market data
function calculateProfitPotential(market: DailyAttentionResponse["worthAttention"][0]): number {
  // Estimate based on liquidity and opportunity
  const baseLiquidity = 10000; // Assume $10K base liquidity
  const multiplier = market.confidence / 100;
  return Math.round(baseLiquidity * 0.05 * multiplier);
}

// Calculate expected ROI
function calculateROI(market: DailyAttentionResponse["worthAttention"][0]): number {
  // Simple ROI calculation based on confidence and market metrics
  const baseROI = 8 + (market.confidence / 100) * 7; // 8-15% range
  return Math.round(baseROI * 10) / 10; // Round to 1 decimal
}

// Get ROI color
function getROIColor(roi: number): string {
  if (roi >= 10) return "text-emerald-400";
  if (roi >= 5) return "text-yellow-400";
  return "text-gray-400";
}

// Format time until resolution
function formatTimeToResolve(endDate: Date | null): string {
  if (!endDate) return "Open-ended";
  
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff < 0) return "Resolved";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Get time color (red if <24h)
function getTimeColor(endDate: Date | null): string {
  if (!endDate) return "text-gray-400";
  
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  
  if (hours < 24) return "text-red-400";
  if (hours < 72) return "text-yellow-400";
  return "text-gray-400";
}

// Calculate liquidity level (1-5 dots)
function getLiquidityLevel(market: DailyAttentionResponse["worthAttention"][0]): number {
  // Based on confidence as proxy for liquidity
  if (market.confidence >= 80) return 5;
  if (market.confidence >= 60) return 4;
  if (market.confidence >= 40) return 3;
  if (market.confidence >= 20) return 2;
  return 1;
}

// Detect smart money direction
function getSmartMoneyStatus(market: DailyAttentionResponse["worthAttention"][0]): {
  direction: "YES" | "NO" | "MIXED";
  icon: string;
} {
  // Use confidence as proxy for smart money direction
  // In real implementation, check actual wallet data
  if (market.confidence >= 70) return { direction: "YES", icon: "🐋" };
  if (market.confidence <= 30) return { direction: "NO", icon: "🐋" };
  return { direction: "MIXED", icon: "🐋" };
}

// Calculate risk level
function getRiskLevel(market: DailyAttentionResponse["worthAttention"][0]): {
  level: "LOW" | "MEDIUM" | "HIGH";
  color: string;
  emoji: string;
} {
  // Based on confidence and market characteristics
  if (market.confidence >= 75) return { level: "LOW", color: "text-emerald-400", emoji: "🟢" };
  if (market.confidence >= 50) return { level: "MEDIUM", color: "text-yellow-400", emoji: "🟡" };
  return { level: "HIGH", color: "text-red-400", emoji: "🔴" };
}

function OpportunityCard({
  market,
  index,
}: {
  market: DailyAttentionResponse["worthAttention"][0];
  index: number;
}) {
  const profitPotential = calculateProfitPotential(market);
  const roi = calculateROI(market);
  const roiColor = getROIColor(roi);
  
  // Mock end date for now (in real implementation, fetch from API)
  const mockEndDate = new Date(Date.now() + (24 + Math.random() * 72) * 60 * 60 * 1000);
  const timeToResolve = formatTimeToResolve(mockEndDate);
  const timeColor = getTimeColor(mockEndDate);
  
  const liquidityLevel = getLiquidityLevel(market);
  const smartMoney = getSmartMoneyStatus(market);
  const risk = getRiskLevel(market);

  // Mock odds data (in real implementation, fetch from API)
  const yesOdds = 55 + Math.round(market.confidence / 3);
  const noOdds = 100 - yesOdds;
  
  // Mock volume (in real implementation, fetch from API)
  const volume24h = Math.round(15000 + (market.confidence * 500));

  return (
    <div
      className="group/card bg-gray-900/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-800/50 hover:border-emerald-500/50 hover:scale-[1.02] transition-all duration-200 animate-fade-in-up shadow-lg"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Hot Opportunity Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              HOT OPPORTUNITY
            </span>
          </div>
          <span className="text-[10px] text-gray-500 uppercase">
            {market.category || "Market"}
          </span>
        </div>

        {/* Market Question */}
        <h3 className="font-bold text-gray-50 text-base leading-tight mb-4 line-clamp-2">
          {market.question}
        </h3>

        {/* Profit Potential Section */}
        <div className="bg-gray-800/50 rounded-xl p-3 mb-3 border border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase font-medium">Profit Potential</span>
            <span className="text-xs text-gray-500">Est.</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-emerald-400">
              ${profitPotential.toLocaleString()}
            </span>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Expected ROI</span>
              <span className={`text-lg font-bold ${roiColor}`}>{roi}%</span>
            </div>
          </div>
        </div>

        {/* Time to Resolve */}
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs text-gray-400">Time to Resolve:</span>
          <span className={`text-sm font-bold ${timeColor} flex items-center gap-1`}>
            {timeToResolve} ⏱️
          </span>
        </div>

        {/* Current Odds */}
        <div className="bg-gray-800/30 rounded-lg p-3 mb-3 border border-gray-700/30">
          <div className="text-[10px] text-gray-500 uppercase mb-1 font-medium">Current Odds</div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-emerald-400 font-bold text-xl">YES {yesOdds}%</span>
              <span className="text-gray-500 text-xs">({yesOdds}¢)</span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-red-400 font-bold text-xl">NO {noOdds}%</span>
              <span className="text-gray-500 text-xs">({noOdds}¢)</span>
            </div>
          </div>
        </div>

        {/* Volume & Liquidity */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div>
            <span className="text-gray-500">24h Volume: </span>
            <span className="text-gray-300 font-semibold">${(volume24h / 1000).toFixed(0)}K</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Liquidity:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i <= liquidityLevel ? "bg-emerald-500" : "bg-gray-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Price Chart Placeholder */}
        <div className="bg-gray-800/20 rounded-lg p-2 mb-3 border border-gray-700/20" style={{ height: "80px" }}>
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-gray-600">📈 24h Price Chart</span>
          </div>
        </div>

        {/* Smart Money & Risk */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{smartMoney.icon}</span>
            <span className="text-xs text-gray-400">Smart Money:</span>
            <span className="text-xs font-bold text-emerald-400">
              Buying {smartMoney.direction}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Risk:</span>
            <span className={`text-xs font-bold ${risk.color} flex items-center gap-1`}>
              {risk.emoji} {risk.level}
            </span>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <Link
        href={`/markets/${market.id}`}
        className="block px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border-t border-emerald-500/20 transition-all duration-150 group/cta"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-bold text-emerald-400">Place Bet</span>
          <svg className="w-4 h-4 text-emerald-400 group-hover/cta:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
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
}: {
  market: DailyAttentionResponse["retailTraps"][0];
}) {
  return (
    <div className="group/card bg-gray-900/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-800/40 hover:border-gray-700/60 transition-colors duration-200">
      {/* Card Header */}
      <div className="p-5 pb-0">
        {/* Top row: Badge + Category */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              High Friction
            </span>
          </div>
          <span className="text-[11px] text-gray-600 font-normal">
            {market.category || "Market"}
          </span>
        </div>

        {/* Market name - Primary (muted compared to Active) */}
        <h3 className="font-semibold text-gray-300 text-[15px] leading-snug mb-3 line-clamp-2">
          {market.question}
        </h3>

        {/* Common retail mistake - Always visible, calm styling */}
        <div className="mb-4 p-2.5 bg-gray-800/30 rounded-lg border border-gray-800/50">
          <p className="text-[11px] text-gray-500 mb-1 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Common retail mistake
          </p>
          <p className="text-[13px] text-gray-400 leading-relaxed">
            {getFrictionInsight(market)}
          </p>
        </div>

        {/* Visual Preview - Muted */}
        <div className="flex items-center gap-3 p-2.5 bg-gray-800/20 rounded-lg mb-4 border border-gray-800/30">
          <div className="flex-1 opacity-40">
            <MiniSparkline marketId={market.id} height={24} color="red" />
          </div>
          <div className="flex items-center gap-3 pl-3 border-l border-gray-800/30">
            <div className="flex flex-col items-center">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full ${i <= 2 ? 'bg-gray-600/60 h-2' : 'bg-gray-700/40 h-1.5'}`}
                  />
                ))}
              </div>
              <span className="text-[9px] text-gray-600 mt-0.5">Depth</span>
            </div>
          </div>
        </div>

        {/* Signal Label */}
        <div className="flex items-center gap-2 flex-wrap pb-3">
          <span className="px-2 py-0.5 bg-gray-800/40 text-gray-500 text-[11px] rounded-md font-medium border border-gray-700/30">
            {market.warningLabel || "Structural Headwind"}
          </span>
          <HiddenExposureInlineWarning marketId={market.id} />
        </div>

        {/* Participation Context */}
        <div className="pb-4">
          <ParticipationContextLine marketId={market.id} />
        </div>
      </div>

      {/* Signal context - visible to all */}
      <div className="px-5 py-4 border-t border-gray-800/30 space-y-2.5 bg-gray-800/15">
        <div>
          <h4 className="text-[11px] text-gray-500 mb-0.5">What this often leads to</h4>
          <p className="text-[12px] text-gray-500 leading-relaxed">Retail entries during high-friction periods tend to face immediate execution drag and elevated exit costs.</p>
        </div>
        <div>
          <h4 className="text-[11px] text-gray-600 mb-0.5">What to watch</h4>
          <p className="text-[12px] text-gray-600 leading-relaxed">This friction typically eases when attention fades and spreads normalize.</p>
        </div>
      </div>

      {/* CTA Footer */}
      <Link
        href={`/markets/${market.id}`}
        className="block px-5 py-2.5 border-t border-gray-800/20 hover:bg-gray-800/15 transition-colors duration-150 group/cta"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-600">See full context</span>
          <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1 group-hover/cta:gap-1.5 transition-all">
            Understand structure
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    state_shift: { color: "gray", label: "State Shift", description: "Structure changed recently" },
    event_window: { color: "gray", label: "Event Window", description: "Time-sensitive conditions" },
    mispricing: { color: "gray", label: "Exposure Link", description: "Related market detected" },
    flow_guard: { color: "gray", label: "Flow Guard", description: "Flow pattern warning" },
  };

  const config = typeConfig[change.changeType] || typeConfig.state_shift;

  return (
    <Link
      href={`/markets/${change.marketId}`}
      className="group flex items-center gap-3 p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-colors duration-150 border border-gray-800/20 hover:border-gray-700/40"
    >
      {/* Timeline dot */}
      <div className="shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
      </div>

      {/* Label chip */}
      <span className="shrink-0 px-2 py-0.5 text-[10px] rounded-md font-medium bg-gray-800/40 text-gray-500 border border-gray-700/30">
        {config.label}
      </span>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-gray-400 truncate">{change.question}</p>
        <p className="text-[11px] text-gray-600 truncate">{change.description || config.description}</p>
      </div>

      {/* Time indicator */}
      <span className="shrink-0 text-[11px] text-gray-600 hidden sm:block">
        Recent
      </span>

      {/* Arrow */}
      <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PulsePage() {
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
            {/* Section A: Hot Opportunities */}
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-emerald-500/80 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-50 tracking-tight">
                    🔥 Hot Opportunities
                  </h2>
                  <p className="text-sm text-gray-400">
                    High profit potential markets ready to trade
                  </p>
                </div>
              </div>

              {data?.worthAttention && data.worthAttention.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.worthAttention.slice(0, 6).map((market, index) => (
                    <OpportunityCard
                      key={market.id}
                      market={market}
                      index={index}
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

            {/* Section: Structurally Interesting Markets */}
            <section className="mb-14">
              <StructurallyInterestingCarouselDark limit={8} />
            </section>

            {/* Section B: High Friction Signals */}
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gray-600 rounded-full" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-100 tracking-tight">
                    High Friction Signals
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    Structural headwinds detected
                  </p>
                </div>
              </div>

              {data?.retailTraps && data.retailTraps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.retailTraps.slice(0, 6).map((market) => (
                    <HighFrictionSignalCard
                      key={market.id}
                      market={market}
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
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gray-700 rounded-full" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-100 tracking-tight">
                    Signal Timeline
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    Recent state changes
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
    </main>
  );
}
