"use client";

import { useQuery } from "@tanstack/react-query";
import { getTimingWindows, type CurrentTimingWindow, type WindowType } from "@/lib/api";

interface TimingWindowBadgeProps {
  marketId: string;
}

export function TimingWindowBadge({ marketId }: TimingWindowBadgeProps) {
  const { data, isLoading, error } = useQuery<CurrentTimingWindow>({
    queryKey: ["timing-windows", marketId],
    queryFn: () => getTimingWindows(marketId),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { currentWindow, upcomingWindows, timeUntilResolution, guidance } = data;

  if (!currentWindow) {
    return null;
  }

  // Window type styling
  const windowStyles: Record<WindowType, { bg: string; border: string; text: string; icon: string; emoji: string }> = {
    dead_zone: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      emoji: "🔵",
    },
    danger_window: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      emoji: "🔴",
    },
    final_positioning: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
      emoji: "🟡",
    },
    opportunity_window: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      text: "text-green-400",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      emoji: "🟢",
    },
  };

  const style = windowStyles[currentWindow.windowType];

  // Format window type for display
  const windowTypeLabels: Record<WindowType, string> = {
    dead_zone: "DEAD ZONE",
    danger_window: "DANGER WINDOW",
    final_positioning: "FINAL POSITIONING",
    opportunity_window: "OPPORTUNITY WINDOW",
  };

  const windowLabel = windowTypeLabels[currentWindow.windowType];

  // Parse retail guidance into bullet points
  const guidancePoints = currentWindow.retailGuidance
    .split(". ")
    .filter(point => point.trim().length > 0)
    .map(point => point.trim().replace(/\.$/, ""));

  // Format time until resolution
  const formatTimeRemaining = (hours: number | null) => {
    if (hours === null) return "No fixed resolution";
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  return (
    <div className={`rounded-lg p-5 border-2 ${style.bg} ${style.border}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center border ${style.border}`}>
          <svg className={`w-6 h-6 ${style.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Current Timing</span>
            <span className={`text-lg font-bold ${style.text}`}>{style.emoji} {windowLabel}</span>
          </div>
          {timeUntilResolution !== null && (
            <div className="text-xs text-gray-400 mt-0.5">
              {formatTimeRemaining(timeUntilResolution)} until resolution
            </div>
          )}
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <p className={`text-sm font-medium ${style.text}`}>{currentWindow.reason}</p>
      </div>

      {/* Retail Guidance */}
      <div className="mb-4">
        <ul className="space-y-2">
          {guidancePoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <span className={`${style.text} flex-shrink-0 mt-1`}>•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trading Guidance */}
      <div className={`rounded-lg p-3 ${style.bg} border ${style.border}`}>
        <div className="flex items-start gap-2 mb-2">
          <svg className={`w-5 h-5 ${style.text} flex-shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <div className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Trading Guidance</div>
            <p className="text-sm text-gray-300">{guidance.reasoning}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Enter:</span>
            <span className={`text-xs font-bold ${guidance.shouldEnter ? "text-green-400" : "text-red-400"}`}>
              {guidance.shouldEnter ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Exit:</span>
            <span className={`text-xs font-bold ${guidance.shouldExit ? "text-red-400" : "text-green-400"}`}>
              {guidance.shouldExit ? "YES" : "NO"}
            </span>
          </div>
          {guidance.waitFor && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-400">Wait for:</span>
              <span className="text-xs font-medium text-yellow-400">{guidance.waitFor}</span>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Windows */}
      {upcomingWindows.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Upcoming Windows</div>
          <div className="space-y-2">
            {upcomingWindows.slice(0, 2).map((window, index) => {
              const upcomingStyle = windowStyles[window.windowType];
              const upcomingLabel = windowTypeLabels[window.windowType];
              const startsIn = Math.round((new Date(window.startsAt).getTime() - Date.now()) / (1000 * 60 * 60));
              
              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className={upcomingStyle.text}>{upcomingStyle.emoji}</span>
                  <span className="text-gray-400">{upcomingLabel}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">
                    in {startsIn < 24 ? `${startsIn}h` : `${Math.round(startsIn / 24)}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

