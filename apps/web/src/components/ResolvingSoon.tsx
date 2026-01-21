"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface Market {
  id: string;
  question: string;
  category: string | null;
  endDate: string | null;
  currentPrice: number | null;
  qualityGrade: string | null;
}

interface MarketsResponse {
  data: Market[];
  total: number;
}

function getTimeRemaining(endDate: string) {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return { expired: true, text: "Resolved", urgency: "resolved" };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let text = "";
  let urgency = "normal";

  if (days > 0) {
    text = `${days}d ${remainingHours}h`;
    urgency = days <= 1 ? "soon" : "normal";
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m`;
    urgency = hours <= 6 ? "urgent" : "soon";
  } else {
    text = `${minutes}m`;
    urgency = "critical";
  }

  return { expired: false, text, urgency };
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeInfo, setTimeInfo] = useState(() => getTimeRemaining(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getTimeRemaining(endDate));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endDate]);

  const urgencyStyles = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
    urgent: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    soon: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    normal: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    resolved: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  };

  return (
    <span className={`px-2 py-1 text-xs font-mono font-bold rounded border ${urgencyStyles[timeInfo.urgency as keyof typeof urgencyStyles]}`}>
      {timeInfo.text}
    </span>
  );
}

export function ResolvingSoon({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useQuery<MarketsResponse>({
    queryKey: ["resolving-soon", limit],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/markets?sortBy=endDate&sortOrder=asc&limit=${limit}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000,
    retry: 1,
  });

  // Filter to only show markets with end dates in the future (within 30 days)
  const upcomingMarkets = data?.data?.filter((m) => {
    if (!m.endDate) return false;
    const end = new Date(m.endDate).getTime();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return end > now && end < now + thirtyDays;
  }) || [];

  if (isLoading) {
    return (
      <div className="bg-[#111820] border border-[#243040] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-orange-500/20 animate-pulse" />
          <div className="h-5 w-32 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (upcomingMarkets.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#111820] border border-[#243040] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
          </span>
          <h2 className="text-lg font-semibold text-white">Resolving Soon</h2>
        </div>
        <Link 
          href="/markets?sortBy=endDate&sortOrder=asc"
          className="text-sm text-orange-400 hover:text-orange-300 font-medium"
        >
          View all →
        </Link>
      </div>

      {/* Markets List */}
      <div className="space-y-3">
        {upcomingMarkets.map((market) => (
          <Link
            key={market.id}
            href={`/markets/${market.id}`}
            className="block p-3 bg-[#0a0f14] hover:bg-[#0d1219] border border-[#243040] hover:border-orange-500/30 rounded-lg transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white group-hover:text-orange-400 transition-colors line-clamp-2 font-medium">
                  {market.question}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {market.category && (
                    <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-500">
                      {market.category}
                    </span>
                  )}
                  {market.currentPrice !== null && (
                    <span className={`text-xs font-mono ${market.currentPrice > 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {market.currentPrice > 0.5 ? 'YES' : 'NO'} @ {(market.currentPrice * 100).toFixed(0)}¢
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {market.endDate && <CountdownTimer endDate={market.endDate} />}
                {market.qualityGrade && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    market.qualityGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                    market.qualityGrade === 'B' ? 'bg-teal-500/20 text-teal-400' :
                    market.qualityGrade === 'C' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {market.qualityGrade}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Urgency Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#243040]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs text-gray-500">&lt;1h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span className="text-xs text-gray-500">&lt;6h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span className="text-xs text-gray-500">&lt;24h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-500"></span>
          <span className="text-xs text-gray-500">&gt;24h</span>
        </div>
      </div>
    </div>
  );
}
