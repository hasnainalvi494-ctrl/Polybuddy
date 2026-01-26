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

        {/* Mobile: Simple stacked grid, Desktop: Bento grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4 auto-rows-auto sm:auto-rows-[140px]">
          
          {/* Best Bets - Full width on mobile */}
          <Link href="/best-bets" className="col-span-2 sm:col-span-6 lg:col-span-6 sm:row-span-3 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 p-4 sm:p-6 md:p-8 hover:scale-[1.02] transition-all duration-300 shadow-xl sm:shadow-2xl">
            <div className="relative z-10 h-full flex flex-col justify-between min-h-[120px] sm:min-h-0">
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-white text-[10px] sm:text-xs font-bold">{signalsData?.total || "15"}+ signals</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-1 sm:mb-3">Best Bets</h2>
                <p className="text-white/90 text-xs sm:text-sm md:text-lg hidden sm:block">AI-powered trading signals based on elite trader activity.</p>
              </div>
              <div className="flex items-center text-white font-medium text-sm sm:text-base md:text-lg mt-2 sm:mt-0">
                View signals
                <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Elite Traders */}
          <Link href="/elite-traders" className="col-span-1 sm:col-span-3 lg:col-span-3 sm:row-span-2 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#1a2332] border border-amber-500/30 p-3 sm:p-4 md:p-6 hover:border-amber-500 hover:scale-[1.02] transition-all duration-300">
            <div className="mb-2 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg w-fit mb-2 sm:mb-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] sm:text-xs rounded">{eliteData?.eliteCount || "30"}+</span>
            </div>
            <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-amber-400 transition-colors">Elite Traders</h3>
            <p className="text-gray-400 text-[10px] sm:text-xs md:text-sm hidden sm:block">Track the smartest money.</p>
          </Link>

          {/* Markets */}
          <Link href="/markets" className="col-span-1 sm:col-span-3 lg:col-span-3 sm:row-span-2 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#1a2332] border border-sky-500/30 p-3 sm:p-4 md:p-6 hover:border-sky-500 hover:scale-[1.02] transition-all duration-300">
            <div className="mb-2 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-sky-500/10 rounded-lg w-fit mb-2 sm:mb-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] sm:text-xs rounded">{marketsData?.total || "500"}+</span>
            </div>
            <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-sky-400 transition-colors">Markets</h3>
            <p className="text-gray-400 text-[10px] sm:text-xs md:text-sm hidden sm:block">Browse prediction markets.</p>
          </Link>

          {/* Stats */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-3 sm:row-span-1 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-3 sm:p-4 flex items-center justify-between">
            <div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">76.3%</div>
              <div className="text-white/80 text-[10px] sm:text-xs">Win Rate</div>
            </div>
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white/80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Whale Activity */}
          <Link href="/whales" className="col-span-1 sm:col-span-3 lg:col-span-3 sm:row-span-2 group relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#1a2332] border border-cyan-500/30 p-3 sm:p-4 md:p-6 hover:border-cyan-500 hover:scale-[1.02] transition-all duration-300">
            <div className="mb-2 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-cyan-500/10 rounded-lg w-fit mb-2 sm:mb-3">
                <span className="text-lg sm:text-2xl">🐋</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-cyan-400 text-[10px] sm:text-xs">Live</span>
              </div>
            </div>
            <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-cyan-400 transition-colors">Whales</h3>
            <p className="text-gray-400 text-[10px] sm:text-xs md:text-sm hidden sm:block">Track big money moves.</p>
          </Link>

          {/* Leaderboard */}
          <Link href="/leaderboard" className="col-span-1 sm:col-span-3 lg:col-span-3 sm:row-span-1 group rounded-xl sm:rounded-2xl bg-[#1a2332] border border-purple-500/30 p-3 sm:p-4 hover:border-purple-500 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-lg font-bold text-white mb-0.5 sm:mb-1">Leaderboard</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs hidden sm:block">Top performers</p>
            </div>
            <svg className="w-5 h-5 sm:w-8 sm:h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </Link>

          {/* Portfolio */}
          <Link href="/portfolio" className="col-span-2 sm:col-span-6 lg:col-span-6 sm:row-span-1 group rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 p-3 sm:p-4 hover:scale-[1.02] transition-all duration-300 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-white">Portfolio</h3>
                <p className="text-white/80 text-[10px] sm:text-sm hidden sm:block">Connect wallet to track positions</p>
              </div>
            </div>
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 text-white text-[10px] sm:text-xs font-medium rounded-full">Soon</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
