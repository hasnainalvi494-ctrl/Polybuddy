"use client";

import { useState, useEffect } from "react";

interface SuccessRateProps {
  rate?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showTrend?: boolean;
}

export function SuccessRate({ rate, label = "profitable", size = "md", showTrend = true }: SuccessRateProps) {
  const [displayRate, setDisplayRate] = useState(0);
  const actualRate = rate || 84; // Default to 84%

  useEffect(() => {
    // Animate the number counting up
    let start = 0;
    const duration = 1500;
    const increment = actualRate / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= actualRate) {
        setDisplayRate(actualRate);
        clearInterval(timer);
      } else {
        setDisplayRate(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [actualRate]);

  const sizeClasses = {
    sm: {
      container: "text-sm",
      rate: "text-2xl",
      icon: "w-4 h-4",
    },
    md: {
      container: "text-base",
      rate: "text-3xl",
      icon: "w-5 h-5",
    },
    lg: {
      container: "text-lg",
      rate: "text-4xl",
      icon: "w-6 h-6",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-3 ${classes.container}`}>
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-1">
          <span className={`font-bold text-emerald-400 ${classes.rate}`}>{displayRate}%</span>
          {showTrend && (
            <svg
              className={`${classes.icon} text-emerald-400`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
        </div>
        <span className="text-gray-400">{label}</span>
      </div>
    </div>
  );
}

// Badge version for inline use
export function SuccessRateBadge({ rate }: { rate?: number }) {
  const actualRate = rate || 84;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <span className="text-xs font-bold text-emerald-400">{actualRate}% Win Rate</span>
    </div>
  );
}

