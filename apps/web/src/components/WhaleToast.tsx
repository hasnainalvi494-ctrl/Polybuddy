"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const API_URL = "https://polybuddy-api-production.up.railway.app";
const SEEN_IDS_KEY = "polybuddy_whale_seen_ids";
const LAST_CHECK_KEY = "polybuddy_whale_last_check";

interface WhaleActivity {
  id: string;
  walletAddress: string;
  marketId: string;
  internalMarketId: string | null;
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

// Load seen IDs from localStorage
function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(SEEN_IDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only keep IDs from last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const filtered = parsed.filter((item: { id: string; time: number }) => item.time > oneDayAgo);
      return new Set(filtered.map((item: { id: string }) => item.id));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

// Save seen IDs to localStorage
function saveSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const items = Array.from(ids).map(id => ({ id, time: Date.now() }));
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(items.slice(-50))); // Keep last 50
  } catch {
    // Ignore storage errors
  }
}

// Check if this is first load (to avoid showing old notifications)
function isFirstLoad(): boolean {
  if (typeof window === "undefined") return true;
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  const now = Date.now();
  localStorage.setItem(LAST_CHECK_KEY, String(now));
  
  if (!lastCheck) return true;
  // If last check was more than 5 minutes ago, treat as first load
  return (now - parseInt(lastCheck)) > 5 * 60 * 1000;
}

export function WhaleToastProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadSeenIds());
  const [isEnabled, setIsEnabled] = useState(true);
  const isFirstLoadRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Initialize on mount - mark all current trades as seen on first load
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    isFirstLoadRef.current = isFirstLoad();
  }, []);

  // Navigate to market when toast is clicked
  const navigateToMarket = useCallback((activity: WhaleActivity) => {
    if (activity.internalMarketId) {
      // Use internal market ID for direct navigation
      router.push(`/markets/${activity.internalMarketId}`);
    } else {
      // Go to whale activity page
      router.push(`/whales`);
    }
  }, [router]);

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

    // On first load, just mark all current trades as seen (don't show notifications)
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      const allIds = new Set(data.trades.map((t: WhaleActivity) => t.id));
      setSeenIds(prev => {
        const merged = new Set([...prev, ...allIds]);
        saveSeenIds(merged);
        return merged;
      });
      return;
    }

    // Only show trades that are:
    // 1. Not already seen
    // 2. >= $10K
    // 3. Happened in the last 10 minutes (to avoid showing old data)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const newActivities = data.trades.filter(
      (activity: WhaleActivity) => 
        !seenIds.has(activity.id) && 
        activity.amountUsd >= 10000 &&
        new Date(activity.timestamp).getTime() > tenMinutesAgo
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
        saveSeenIds(next);
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
            <div 
              onClick={() => navigateToMarket(toast.activity)}
              className={`p-4 rounded-xl border shadow-2xl backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-transform ${
                toast.activity.action === "buy" 
                  ? "bg-emerald-900/90 border-emerald-500/50 hover:border-emerald-400" 
                  : "bg-red-900/90 border-red-500/50 hover:border-red-400"
              }`}
            >
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
                  
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 text-xs font-mono">
                      {formatAddress(toast.activity.walletAddress)}
                    </p>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View
                    </span>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toast.id);
                  }}
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
