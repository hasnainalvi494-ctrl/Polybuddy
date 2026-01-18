"use client";

import { useState, useEffect } from "react";

interface Win {
  id: string;
  name: string;
  amount: number;
  market: string;
  timestamp: number;
}

// Mock data generator for recent wins
function generateMockWins(): Win[] {
  const names = ["John", "Sarah", "Mike", "Emma", "Alex", "Lisa", "David", "Maria", "Chris", "Anna"];
  const markets = [
    "Trump 2024",
    "Fed Rate Cut",
    "Bitcoin $100K",
    "NBA Finals",
    "Recession 2024",
    "AI Regulation",
  ];

  return Array.from({ length: 20 }, (_, i) => ({
    id: `win-${i}`,
    name: names[Math.floor(Math.random() * names.length)],
    amount: Math.floor(Math.random() * 5000) + 100,
    market: markets[Math.floor(Math.random() * markets.length)],
    timestamp: Date.now() - Math.random() * 3600000, // Last hour
  }));
}

export function RecentWinsTicker() {
  const [wins, setWins] = useState<Win[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setWins(generateMockWins());
  }, []);

  useEffect(() => {
    if (wins.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % wins.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [wins.length]);

  if (wins.length === 0) return null;

  const currentWin = wins[currentIndex];

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-lg px-4 py-3 overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Trophy Icon */}
        <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>

        {/* Win Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 truncate animate-fade-in-up">
            <span className="font-semibold text-emerald-400">{currentWin.name}</span> won{" "}
            <span className="font-bold text-emerald-400">${currentWin.amount.toLocaleString()}</span> on{" "}
            <span className="text-gray-300">{currentWin.market}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {Math.floor((Date.now() - currentWin.timestamp) / 60000)} minutes ago
          </p>
        </div>

        {/* Pulse indicator */}
        <div className="flex-shrink-0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact version for sidebar/small spaces
export function RecentWinsTickerCompact() {
  const [wins, setWins] = useState<Win[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setWins(generateMockWins());
  }, []);

  useEffect(() => {
    if (wins.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % wins.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [wins.length]);

  if (wins.length === 0) return null;

  const currentWin = wins[currentIndex];

  return (
    <div className="flex items-center gap-2 text-xs">
      <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-gray-400 animate-fade-in-up">
        <span className="font-semibold text-emerald-400">{currentWin.name}</span> won{" "}
        <span className="font-bold text-emerald-400">${currentWin.amount.toLocaleString()}</span>
      </span>
    </div>
  );
}


