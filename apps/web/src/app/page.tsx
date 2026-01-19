"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

const API_URL = "https://polybuddy-api-production.up.railway.app";

export default function HomePage() {
  // Fetch counts for badges
  const { data: eliteData } = useQuery({
    queryKey: ["elite-count"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/elite-traders?limit=1`);
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: signalsData } = useQuery({
    queryKey: ["signals-count"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/best-bets-signals?limit=1`);
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: marketsData } = useQuery({
    queryKey: ["markets-count"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/markets?limit=1`);
      return res.json();
    },
    staleTime: 60000,
  });

  return (
    <main className="min-h-screen bg-[#0a0f14]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f14] via-[#111820] to-[#0d1219]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.1),transparent_50%)]" />
        
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          {/* Live indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111820] border border-[#243040] mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-sm text-gray-400">Live data from Polymarket</span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Smarter</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            See what elite traders are betting on. Get AI-powered signals. Beat the market.
          </p>
          
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-16">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Real Polymarket data
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Updated every 5 minutes
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              100% free to use
            </span>
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="max-w-6xl mx-auto px-4 pb-20 -mt-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Best Bets Card */}
          <Link href="/best-bets" className="group">
            <div className="h-full p-6 rounded-2xl bg-[#111820] border border-[#243040] hover:border-teal-500/50 transition-all duration-300 hover:shadow-glow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30">
                  <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                {signalsData?.signals?.length > 0 && (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    {signalsData.signals.length} signals
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-teal-400 transition-colors">
                Best Bets
              </h2>
              <p className="text-gray-400 text-sm">
                AI-powered trading signals based on elite trader activity and market analysis.
              </p>
              <div className="mt-4 flex items-center text-teal-400 text-sm font-medium">
                View signals
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Elite Traders Card */}
          <Link href="/elite-traders" className="group">
            <div className="h-full p-6 rounded-2xl bg-[#111820] border border-[#243040] hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_20px_0_rgba(245,158,11,0.2)]">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                {eliteData?.eliteCount > 0 && (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {eliteData.eliteCount} elite
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Elite Traders
              </h2>
              <p className="text-gray-400 text-sm">
                Real leaderboard from Polymarket. Track the smartest money and their performance.
              </p>
              <div className="mt-4 flex items-center text-amber-400 text-sm font-medium">
                View traders
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Markets Card */}
          <Link href="/markets" className="group">
            <div className="h-full p-6 rounded-2xl bg-[#111820] border border-[#243040] hover:border-sky-500/50 transition-all duration-300 hover:shadow-[0_0_20px_0_rgba(14,165,233,0.2)]">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/30">
                  <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                {marketsData?.total > 0 && (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    {marketsData.total}+ markets
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-sky-400 transition-colors">
                All Markets
              </h2>
              <p className="text-gray-400 text-sm">
                Browse all active prediction markets. Filter by category, volume, and more.
              </p>
              <div className="mt-4 flex items-center text-sky-400 text-sm font-medium">
                Browse markets
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Whale Activity Card */}
          <Link href="/pulse" className="group">
            <div className="h-full p-6 rounded-2xl bg-[#111820] border border-[#243040] hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_20px_0_rgba(168,85,247,0.2)]">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Live feed
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                Market Pulse
              </h2>
              <p className="text-gray-400 text-sm">
                Real-time market activity, volume spikes, and trending predictions.
              </p>
              <div className="mt-4 flex items-center text-purple-400 text-sm font-medium">
                See activity
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Signals Card */}
          <Link href="/signals" className="group">
            <div className="h-full p-6 rounded-2xl bg-[#111820] border border-[#243040] hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_0_20px_0_rgba(16,185,129,0.2)]">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                Daily Signals
              </h2>
              <p className="text-gray-400 text-sm">
                Curated daily picks with entry points, targets, and risk assessment.
              </p>
              <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium">
                View daily picks
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Portfolio Card */}
          <Link href="/portfolio" className="group">
            <div className="h-full p-6 rounded-2xl bg-[#111820] border border-[#243040] hover:border-rose-500/50 transition-all duration-300 hover:shadow-[0_0_20px_0_rgba(244,63,94,0.2)]">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30">
                  <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Coming soon
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-rose-400 transition-colors">
                Portfolio
              </h2>
              <p className="text-gray-400 text-sm">
                Connect your wallet to track positions, P&L, and compare to elite traders.
              </p>
              <div className="mt-4 flex items-center text-rose-400 text-sm font-medium">
                Learn more
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#243040] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>PolyBuddy • Your smart companion for prediction markets</p>
          <p className="mt-2 text-gray-600">Not affiliated with Polymarket. For informational purposes only.</p>
        </div>
      </footer>
    </main>
  );
}
