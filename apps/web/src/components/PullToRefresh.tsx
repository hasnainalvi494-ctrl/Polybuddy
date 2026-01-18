"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80; // Distance to trigger refresh

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
        setStartY(touchStartY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || window.scrollY > 0) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY;

      if (distance > 0 && distance < threshold * 2) {
        setPullDistance(distance);
        // Prevent default scroll if pulling down
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform"
          style={{
            transform: `translateY(${Math.min(pullDistance - 40, 40)}px)`,
            opacity: isRefreshing ? 1 : progress,
          }}
        >
          <div className="bg-gray-800 rounded-full p-3 shadow-lg border border-gray-700">
            {isRefreshing ? (
              <svg
                className="w-6 h-6 text-emerald-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-emerald-400 transition-transform"
                style={{ transform: `rotate(${progress * 180}deg)` }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: isRefreshing ? "translateY(60px)" : `translateY(${Math.min(pullDistance * 0.5, 40)}px)`,
          transition: isRefreshing || pullDistance === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}


