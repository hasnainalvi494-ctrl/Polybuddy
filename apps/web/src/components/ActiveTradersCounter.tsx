"use client";

import { useState, useEffect } from "react";

interface ActiveTradersCounterProps {
  count?: number;
  variant?: "default" | "compact" | "badge";
}

export function ActiveTradersCounter({ count, variant = "default" }: ActiveTradersCounterProps) {
  const [displayCount, setDisplayCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Generate realistic count with some variance
  const baseCount = count || 1247;
  const [actualCount, setActualCount] = useState(baseCount);

  useEffect(() => {
    // Animate initial count
    let start = 0;
    const duration = 1500;
    const increment = actualCount / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= actualCount) {
        setDisplayCount(actualCount);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [actualCount]);

  useEffect(() => {
    // Simulate live updates - small changes every 10-30 seconds
    const interval = setInterval(() => {
      const change = Math.floor(Math.random() * 10) - 3; // -3 to +6
      setActualCount((prev) => Math.max(100, prev + change));
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }, Math.random() * 20000 + 10000); // 10-30 seconds

    return () => clearInterval(interval);
  }, []);

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-2 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-gray-400">
          <span className={`font-bold text-emerald-400 ${isAnimating ? "scale-110" : ""} transition-transform`}>
            {displayCount.toLocaleString()}
          </span>{" "}
          traders active
        </span>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-semibold text-emerald-400">
          {displayCount.toLocaleString()} Active Now
        </span>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg">
      <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold text-emerald-400 ${isAnimating ? "scale-110" : ""} transition-transform`}>
            {displayCount.toLocaleString()}
          </span>
          <span className="text-sm text-gray-400">traders</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-gray-500">active now</span>
        </div>
      </div>
    </div>
  );
}

