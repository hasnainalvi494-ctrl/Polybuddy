"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

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
    <main className="min-h-screen bg-[#0a0f14] p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-full mb-3 sm:mb-4">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-teal-400 rounded-full animate-pulse" />
            <span className="text-teal-400 text-xs sm:text-sm">Live data from Polymarket</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2 sm:mb-3">
            Poly<span className="text-teal-400">Buddy</span>
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-gray-400">Clear signals. Better trades. More wins. 💸</p>
        </div>

        {/* Mobile: Vertical list, Tablet+: Bento grid */}
        
        {/* MOBILE LAYOUT (< 640px) - Simple vertical list */}
        <div className="flex flex-col gap-3 sm:hidden">
          {/* Best Bets */}
          <Link href="/best-bets" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Best Bets</h3>
              <p className="text-white/80 text-xs">AI trading signals</p>
            </div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold shrink-0">{signalsData?.total || "15"}+</span>
          </Link>

          {/* Elite Traders */}
          <Link href="/elite-traders" className="flex items-center gap-3 p-3 rounded-xl bg-[#1a2332] border border-amber-500/30">
            <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Elite Traders</h3>
              <p className="text-gray-400 text-xs">Top performers</p>
            </div>
            <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-[10px] shrink-0">{eliteData?.eliteCount || "30"}+</span>
          </Link>

          {/* Markets */}
          <Link href="/markets" className="flex items-center gap-3 p-3 rounded-xl bg-[#1a2332] border border-sky-500/30">
            <div className="p-2 bg-sky-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Markets</h3>
              <p className="text-gray-400 text-xs">Browse predictions</p>
            </div>
            <span className="px-2 py-1 bg-sky-500/10 border border-sky-500/30 rounded text-sky-400 text-[10px] shrink-0">{marketsData?.total || "500"}+</span>
          </Link>

          {/* Whales */}
          <Link href="/whales" className="flex items-center gap-3 p-3 rounded-xl bg-[#1a2332] border border-cyan-500/30">
            <div className="p-2 bg-cyan-500/10 rounded-lg shrink-0">
              <span className="text-xl">🐋</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Whale Activity</h3>
              <p className="text-gray-400 text-xs">Track big money</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-cyan-400 text-[10px]">Live</span>
            </div>
          </Link>

          {/* Leaderboard */}
          <Link href="/leaderboard" className="flex items-center gap-3 p-3 rounded-xl bg-[#1a2332] border border-purple-500/30">
            <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Leaderboard</h3>
              <p className="text-gray-400 text-xs">Rankings</p>
            </div>
            <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Stats bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-white font-medium text-sm">Win Rate</span>
            </div>
            <span className="text-xl font-bold text-white">76.3%</span>
          </div>

          {/* Portfolio */}
          <Link href="/portfolio" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Portfolio</h3>
              <p className="text-white/80 text-xs">Track P&L</p>
            </div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold shrink-0">NEW</span>
          </Link>

          {/* Alerts */}
          <Link href="/alerts-center" className="flex items-center gap-3 p-3 rounded-xl bg-[#1a2332] border border-green-500/30">
            <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Smart Alerts</h3>
              <p className="text-gray-400 text-xs">Never miss trades</p>
            </div>
            <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-[10px] font-bold shrink-0">NEW</span>
          </Link>

          {/* Copy Trading */}
          <Link href="/copy-trading" className="flex items-center gap-3 p-3 rounded-xl bg-[#1a2332] border border-indigo-500/30">
            <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Copy Trading</h3>
              <p className="text-gray-400 text-xs">Follow elite traders</p>
            </div>
            <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded text-indigo-400 text-[10px] font-bold shrink-0">NEW</span>
          </Link>

          {/* Risk Management */}
          <Link href="/risk-dashboard" className="flex items-center gap-3 p-3 rounded-xl bg-[#1a2332] border border-red-500/30">
            <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Risk Manager</h3>
              <p className="text-gray-400 text-xs">Protect capital</p>
            </div>
            <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px] font-bold shrink-0">NEW</span>
          </Link>

          {/* Advanced Charts */}
          <Link href="/charts" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white">Advanced Charts</h3>
              <p className="text-white/80 text-xs">Pro analysis</p>
            </div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold shrink-0">NEW</span>
          </Link>
        </div>

        {/* TABLET/DESKTOP LAYOUT (>= 640px) - Bento grid */}
        <div className="hidden sm:grid sm:grid-cols-6 lg:grid-cols-12 gap-3 md:gap-4 auto-rows-[140px]">
          {/* Best Bets - Large Feature */}
          <Link href="/best-bets" className="col-span-6 row-span-3 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 p-6 md:p-8 hover:scale-[1.02] transition-all duration-300 shadow-2xl">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold">{signalsData?.total || "15"}+ signals</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">Best Bets</h2>
                <p className="text-white/90 text-sm md:text-lg">AI-powered trading signals based on elite trader activity.</p>
              </div>
              <div className="flex items-center text-white font-medium text-base md:text-lg">
                View signals
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Elite Traders */}
          <Link href="/elite-traders" className="col-span-3 row-span-2 group relative overflow-hidden rounded-2xl bg-[#1a2332] border border-amber-500/30 p-4 md:p-6 hover:border-amber-500 hover:scale-[1.02] transition-all duration-300">
            <div className="mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg w-fit mb-3">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                </svg>
              </div>
              <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded">{eliteData?.eliteCount || "30"}+ elite</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">Elite Traders</h3>
            <p className="text-gray-400 text-xs md:text-sm">Track the smartest money.</p>
          </Link>

          {/* Markets */}
          <Link href="/markets" className="col-span-3 row-span-2 group relative overflow-hidden rounded-2xl bg-[#1a2332] border border-sky-500/30 p-4 md:p-6 hover:border-sky-500 hover:scale-[1.02] transition-all duration-300">
            <div className="mb-4">
              <div className="p-2 bg-sky-500/10 rounded-lg w-fit mb-3">
                <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="px-2 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs rounded">{marketsData?.total || "500"}+ markets</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-sky-400 transition-colors">All Markets</h3>
            <p className="text-gray-400 text-xs md:text-sm">Browse prediction markets.</p>
          </Link>

          {/* Stats */}
          <div className="col-span-3 row-span-1 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
            <div>
              <div className="text-xl md:text-2xl font-bold text-white">76.3%</div>
              <div className="text-white/80 text-xs">Win Rate</div>
            </div>
            <svg className="w-8 h-8 text-white/80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Whale Activity */}
          <Link href="/whales" className="col-span-3 row-span-2 group relative overflow-hidden rounded-2xl bg-[#1a2332] border border-cyan-500/30 p-4 md:p-6 hover:border-cyan-500 hover:scale-[1.02] transition-all duration-300">
            <div className="mb-4">
              <div className="p-2 bg-cyan-500/10 rounded-lg w-fit mb-3">
                <span className="text-2xl">🐋</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-cyan-400 text-xs">Live</span>
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Whale Activity</h3>
            <p className="text-gray-400 text-xs md:text-sm">Track big money moves.</p>
          </Link>

          {/* Leaderboard */}
          <Link href="/leaderboard" className="col-span-3 row-span-1 group rounded-2xl bg-[#1a2332] border border-purple-500/30 p-4 hover:border-purple-500 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Leaderboard</h3>
              <p className="text-gray-400 text-xs">Top performers</p>
            </div>
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138" />
            </svg>
          </Link>

          {/* Portfolio */}
          <Link href="/portfolio" className="col-span-3 row-span-1 group rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 p-4 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Portfolio</h3>
                <p className="text-white/80 text-xs">Track P&L</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-white/20 text-white text-[10px] font-bold rounded-full">NEW</span>
          </Link>

          {/* Alerts */}
          <Link href="/alerts-center" className="col-span-3 row-span-1 group rounded-2xl bg-[#1a2332] border border-green-500/30 p-4 hover:border-green-500 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Alerts</h3>
                <p className="text-gray-400 text-xs">Never miss</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold rounded">NEW</span>
          </Link>

          {/* Copy Trading */}
          <Link href="/copy-trading" className="col-span-3 row-span-1 group rounded-2xl bg-[#1a2332] border border-indigo-500/30 p-4 hover:border-indigo-500 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Copy Trading</h3>
                <p className="text-gray-400 text-xs">Follow pros</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold rounded">NEW</span>
          </Link>

          {/* Risk Management */}
          <Link href="/risk-dashboard" className="col-span-3 row-span-1 group rounded-2xl bg-[#1a2332] border border-red-500/30 p-4 hover:border-red-500 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Risk Manager</h3>
                <p className="text-gray-400 text-xs">Protect $</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold rounded">NEW</span>
          </Link>

          {/* Advanced Charts */}
          <Link href="/charts" className="col-span-3 row-span-1 group rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-4 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Charts</h3>
                <p className="text-white/80 text-xs">Pro analysis</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-white/20 text-white text-[10px] font-bold rounded-full">NEW</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
