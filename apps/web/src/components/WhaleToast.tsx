"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface WhaleActivity {
  id: string;
  walletAddress: string;
  marketName: string;
  action: string;
  outcome: string;
  amountUsd: number;
  timestamp: string;
  isHot: boolean;
}

interface Toast {
  id: string;
  activity: WhaleActivity;
  visible: boolean;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatAddress(address: string): string {
  if (!address) return "Unknown";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WhaleToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [isEnabled, setIsEnabled] = useState(true);

  // Fetch whale activity
  const { data } = useQuery({
    queryKey: ["whale-activity-toasts"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/whale-activity?limit=5`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
    enabled: isEnabled,
  });

  // Show new toasts when data changes
  useEffect(() => {
    if (!data?.trades || !isEnabled) return;

    const newActivities = data.trades.filter(
      (activity: WhaleActivity) => 
        !seenIds.has(activity.id) && 
        activity.amountUsd >= 10000 // Only show trades >= $10K
    );

    if (newActivities.length > 0) {
      // Add new toasts
      const newToasts = newActivities.slice(0, 2).map((activity: WhaleActivity) => ({
        id: activity.id,
        activity,
        visible: true,
      }));

      setToasts((prev) => [...newToasts, ...prev].slice(0, 3));
      setSeenIds((prev) => {
        const next = new Set(prev);
        newActivities.forEach((a: WhaleActivity) => next.add(a.id));
        return next;
      });

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) =>
            newActivities.some((a: WhaleActivity) => a.id === t.id) ? { ...t, visible: false } : t
          )
        );
      }, 8000);

      // Remove from DOM after animation
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => !newActivities.some((a: WhaleActivity) => a.id === t.id)));
      }, 8500);
    }
  }, [data, seenIds, isEnabled]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 500);
  }, []);

  return (
    <>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`transform transition-all duration-500 ${
              toast.visible 
                ? "translate-x-0 opacity-100" 
                : "translate-x-full opacity-0"
            }`}
          >
            <div className={`p-4 rounded-xl border shadow-2xl backdrop-blur-sm ${
              toast.activity.action === "buy" 
                ? "bg-emerald-900/90 border-emerald-500/50" 
                : "bg-red-900/90 border-red-500/50"
            }`}>
              <div className="flex items-start gap-3">
                {/* Whale Icon */}
                <div className={`p-2 rounded-lg ${
                  toast.activity.action === "buy" 
                    ? "bg-emerald-500/20" 
                    : "bg-red-500/20"
                }`}>
                  <span className="text-xl">🐋</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${
                      toast.activity.action === "buy" 
                        ? "text-emerald-400" 
                        : "text-red-400"
                    }`}>
                      Whale {toast.activity.action === "buy" ? "Bought" : "Sold"} {toast.activity.outcome.toUpperCase()}
                    </span>
                    {toast.activity.isHot && (
                      <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
                        HOT
                      </span>
                    )}
                  </div>
                  
                  <p className="text-white font-bold text-lg mb-1">
                    {formatAmount(toast.activity.amountUsd)}
                  </p>
                  
                  <p className="text-gray-300 text-xs line-clamp-2 mb-1">
                    {toast.activity.marketName || "Unknown Market"}
                  </p>
                  
                  <p className="text-gray-500 text-xs font-mono">
                    {formatAddress(toast.activity.walletAddress)}
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toggle Button (fixed bottom left) */}
      <button
        onClick={() => setIsEnabled((prev) => !prev)}
        className={`fixed bottom-4 left-4 z-50 p-3 rounded-full shadow-lg transition-all ${
          isEnabled 
            ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400" 
            : "bg-gray-800 border border-gray-700 text-gray-500"
        }`}
        title={isEnabled ? "Whale alerts ON" : "Whale alerts OFF"}
      >
        <span className="text-lg">🐋</span>
      </button>
    </>
  );
}
