"use client";

import { useState, useEffect } from "react";

interface RecentTrade {
  id: string;
  wallet: string;
  amount: number;
  market: string;
  outcome: string;
  timestamp: number;
}

const API_URL = "https://polybuddy-api-production.up.railway.app";

// Fetch real whale activity from API
async function fetchRecentWhaleActivity(): Promise<RecentTrade[]> {
  try {
    const response = await fetch(`${API_URL}/api/whale-activity?limit=20`, {
      headers: { "Accept": "application/json" },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!data.trades || !Array.isArray(data.trades)) return [];
    
    return data.trades.map((trade: any) => ({
      id: trade.id,
      wallet: trade.walletAddress?.slice(0, 6) + "..." + trade.walletAddress?.slice(-4) || "Whale",
      amount: Math.round(trade.amountUsd || 0),
      market: trade.marketName?.slice(0, 30) || "Unknown Market",
      outcome: trade.outcome?.toUpperCase() || "YES",
      timestamp: new Date(trade.timestamp).getTime(),
    }));
  } catch (error) {
    console.error("Failed to fetch whale activity:", error);
    return [];
  }
}

export function RecentWinsTicker() {
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data
    fetchRecentWhaleActivity().then((data) => {
      setTrades(data);
      setIsLoading(false);
    });

    // Refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      fetchRecentWhaleActivity().then(setTrades);
    }, 2 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (trades.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trades.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [trades.length]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-lg">🐋</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Loading whale activity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
            <span className="text-lg">🐋</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Monitoring whale activity...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentTrade = trades[currentIndex];
  if (!currentTrade) return null;

  const timeAgo = Math.floor((Date.now() - currentTrade.timestamp) / 60000);
  const timeLabel = timeAgo < 1 ? "just now" : timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;

  return (
    <div className="bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/20 rounded-lg px-4 py-3 overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Whale Icon */}
        <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
          <span className="text-lg">🐋</span>
        </div>

        {/* Trade Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 truncate animate-fade-in-up">
            <span className="font-semibold text-cyan-400">{currentTrade.wallet}</span> placed{" "}
            <span className="font-bold text-cyan-400">${currentTrade.amount.toLocaleString()}</span> on{" "}
            <span className={currentTrade.outcome === "YES" ? "text-green-400" : "text-red-400"}>
              {currentTrade.outcome}
            </span>{" "}
            <span className="text-gray-400">"{currentTrade.market}"</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{timeLabel}</p>
        </div>

        {/* Live indicator */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <span className="text-xs text-cyan-400 uppercase font-medium">Live</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact version for sidebar/small spaces
export function RecentWinsTickerCompact() {
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchRecentWhaleActivity().then(setTrades);
    
    const refreshInterval = setInterval(() => {
      fetchRecentWhaleActivity().then(setTrades);
    }, 2 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (trades.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trades.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [trades.length]);

  if (trades.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-lg">🐋</span>
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  const currentTrade = trades[currentIndex];
  if (!currentTrade) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-lg">🐋</span>
      <span className="text-gray-400 animate-fade-in-up">
        <span className="font-semibold text-cyan-400">{currentTrade.wallet}</span>{" "}
        <span className="font-bold text-cyan-400">${currentTrade.amount.toLocaleString()}</span>{" "}
        <span className={currentTrade.outcome === "YES" ? "text-green-400" : "text-red-400"}>
          {currentTrade.outcome}
        </span>
      </span>
    </div>
  );
}
