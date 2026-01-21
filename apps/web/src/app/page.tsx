"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ResolvingSoon } from "@/components/ResolvingSoon";

const API_URL = "https://polybuddy-api-production.up.railway.app";

export default function HomePage() {
  // Fetch counts for badges with error handling
  const { data: eliteData } = useQuery({
    queryKey: ["elite-count"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/api/elite-traders?limit=1`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    retry: 1,
  });

  const { data: signalsData } = useQuery({
    queryKey: ["signals-count"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/api/best-bets-signals?limit=1`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    retry: 1,
  });

  const { data: marketsData } = useQuery({
    queryKey: ["markets-count"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/api/markets?limit=1`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    retry: 1,
  });

  return (
    <main className="min-h-screen bg-[#0a0f14]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f14] via-[#111820] to-[#0d1219]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.15),transparent_60%)]" />
        
        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-16 text-center">
          {/* Live indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111820] border border-[#243040] mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-sm text-gray-300">Live data from Polymarket</span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Smarter</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
            See what elite traders are betting on. Get AI-powered signals. Beat the market.
          </p>
          
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
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
              100% free
            </span>
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Best Bets Card */}
          <Link href="/best-bets" className="group block">
            <div className="h-full p-5 rounded-xl bg-[#111820] border border-[#243040] hover:border-teal-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(20,184,166,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {signalsData?.signals?.length || signalsData?.total || "15"}+ signals
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-teal-400 transition-colors">
                Best Bets
              </h2>
              <p className="text-gray-500 text-sm mb-3">
                AI-powered trading signals based on elite trader activity.
              </p>
              <div className="flex items-center text-teal-400 text-sm font-medium">
                View signals
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Elite Traders Card */}
          <Link href="/elite-traders" className="group block">
            <div className="h-full p-5 rounded-xl bg-[#111820] border border-[#243040] hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {eliteData?.eliteCount || "30"}+ elite
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-amber-400 transition-colors">
                Elite Traders
              </h2>
              <p className="text-gray-500 text-sm mb-3">
                Real Polymarket leaderboard. Track the smartest money.
              </p>
              <div className="flex items-center text-amber-400 text-sm font-medium">
                View traders
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Markets Card */}
          <Link href="/markets" className="group block">
            <div className="h-full p-5 rounded-xl bg-[#111820] border border-[#243040] hover:border-sky-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(14,165,233,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                  <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {marketsData?.total || "500"}+ markets
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-sky-400 transition-colors">
                All Markets
              </h2>
              <p className="text-gray-500 text-sm mb-3">
                Browse active prediction markets. Filter by category & volume.
              </p>
              <div className="flex items-center text-sky-400 text-sm font-medium">
                Browse markets
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Leaderboard Card */}
          <Link href="/leaderboard" className="group block">
            <div className="h-full p-5 rounded-xl bg-[#111820] border border-[#243040] hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Rankings
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                Leaderboard
              </h2>
              <p className="text-gray-500 text-sm mb-3">
                Top performing traders ranked by profit and consistency.
              </p>
              <div className="flex items-center text-purple-400 text-sm font-medium">
                View rankings
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Whale Activity Card */}
          <Link href="/whales" className="group block">
            <div className="h-full p-5 rounded-xl bg-[#111820] border border-[#243040] hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-xl">🐋</span>
                </div>
                <span className="relative flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  Live
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                Whale Activity
              </h2>
              <p className="text-gray-500 text-sm mb-3">
                Track big money moves. See what whales are betting on.
              </p>
              <div className="flex items-center text-cyan-400 text-sm font-medium">
                Follow whales
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Portfolio Card */}
          <Link href="/portfolio" className="group block">
            <div className="h-full p-5 rounded-xl bg-[#111820] border border-[#243040] hover:border-rose-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(244,63,94,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Soon
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-rose-400 transition-colors">
                Portfolio
              </h2>
              <p className="text-gray-500 text-sm mb-3">
                Connect wallet to track positions and compare to elites.
              </p>
              <div className="flex items-center text-rose-400 text-sm font-medium">
                Learn more
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

        </div>
      </section>

      {/* Resolving Soon Section */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <ResolvingSoon limit={5} />
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a2332] py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>PolyBuddy • Your smart companion for prediction markets</p>
          <p className="mt-1 text-gray-600 text-xs">Not affiliated with Polymarket. For informational purposes only.</p>
        </div>
      </footer>
    </main>
  );
}
