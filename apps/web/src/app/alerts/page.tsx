"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAlerts,
  getMarkets,
  createAlert,
  dismissAlert,
  deleteAlert,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  processAlerts,
  type Notification,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type AlertCondition =
  | { type: "price_move"; direction: "above" | "below"; threshold: number }
  | { type: "volume_spike"; multiplier: number; timeWindow: number }
  | { type: "liquidity_drop"; dropPercent: number; timeWindow: number }
  | { type: "resolution_approaching"; hoursBeforeEnd: number };

interface Alert {
  id: string;
  marketId: string;
  marketQuestion: string;
  type: "price_move" | "volume_spike" | "liquidity_drop" | "resolution_approaching";
  condition: AlertCondition;
  status: "active" | "triggered" | "dismissed";
  triggeredAt: string | null;
  createdAt: string;
}

interface Market {
  id: string;
  question: string;
  currentPrice: number | null;
}

interface MarketsResponse {
  data: Market[];
  total: number;
}

// Notification type icon component
function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "price_move":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      );
    case "volume_spike":
      return (
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      );
    case "resolution_approaching":
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      );
  }
}

export default function AlertsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"alerts" | "inbox">("inbox");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [alertType, setAlertType] = useState<"price_move" | "volume_spike" | "liquidity_drop" | "resolution_approaching">("price_move");
  const [priceDirection, setPriceDirection] = useState<"above" | "below">("above");
  const [priceThreshold, setPriceThreshold] = useState("0.5");
  const [volumeMultiplier, setVolumeMultiplier] = useState("2");
  const [liquidityDropPercent, setLiquidityDropPercent] = useState("20");
  const [hoursBeforeEnd, setHoursBeforeEnd] = useState("24");
  const [timeWindow, setTimeWindow] = useState("3600");

  const queryClient = useQueryClient();

  const { data: alerts, isLoading, error } = useQuery<Alert[]>({
    queryKey: ["alerts", statusFilter],
    queryFn: () => getAlerts(statusFilter) as Promise<Alert[]>,
    enabled: isAuthenticated && activeTab === "alerts",
  });

  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ limit: 50 }),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: searchResults } = useQuery<MarketsResponse>({
    queryKey: ["markets-search", searchQuery],
    queryFn: () => getMarkets({ search: searchQuery, limit: 10 }) as Promise<MarketsResponse>,
    enabled: searchQuery.length > 2,
  });

  const createMutation = useMutation({
    mutationFn: (condition: AlertCondition) => createAlert(selectedMarket!.id, condition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      resetForm();
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (alertId: string) => dismissAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) => deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const processMutation = useMutation({
    mutationFn: () => processAlerts(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (data.triggered > 0) {
        // Could show a toast here
      }
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const resetForm = () => {
    setShowCreateForm(false);
    setSearchQuery("");
    setSelectedMarket(null);
    setAlertType("price_move");
    setPriceDirection("above");
    setPriceThreshold("0.5");
    setVolumeMultiplier("2");
    setLiquidityDropPercent("20");
    setHoursBeforeEnd("24");
    setTimeWindow("3600");
  };

  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  const handleCreate = () => {
    if (!selectedMarket) return;

    let condition: AlertCondition;
    if (alertType === "price_move") {
      condition = {
        type: "price_move",
        direction: priceDirection,
        threshold: parseFloat(priceThreshold),
      };
    } else if (alertType === "volume_spike") {
      condition = {
        type: "volume_spike",
        multiplier: parseFloat(volumeMultiplier),
        timeWindow: parseInt(timeWindow, 10),
      };
    } else if (alertType === "resolution_approaching") {
      condition = {
        type: "resolution_approaching",
        hoursBeforeEnd: parseInt(hoursBeforeEnd, 10),
      };
    } else {
      condition = {
        type: "liquidity_drop",
        dropPercent: parseFloat(liquidityDropPercent),
        timeWindow: parseInt(timeWindow, 10),
      };
    }

    createMutation.mutate(condition);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatCondition = (condition: AlertCondition) => {
    if (condition.type === "price_move") {
      return `Price ${condition.direction} ${(condition.threshold * 100).toFixed(0)}%`;
    } else if (condition.type === "volume_spike") {
      return `Volume ${condition.multiplier}x spike`;
    } else if (condition.type === "resolution_approaching") {
      return `${condition.hoursBeforeEnd}h before resolution`;
    } else {
      return `Liquidity drops ${condition.dropPercent}%`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "triggered":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "dismissed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "price_move":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "volume_spike":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "liquidity_drop":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "resolution_approaching":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const unreadCount = notificationsData?.unreadCount ?? 0;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Alerts & Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Get notified when market conditions change
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => processMutation.mutate()}
                disabled={processMutation.isPending}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                title="Check all alerts for trigger conditions"
              >
                {processMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Alert
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === "inbox"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Inbox
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === "alerts"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Manage Alerts
            </button>
          </div>
        </div>

        {/* Create Alert Form */}
        {showCreateForm && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Create New Alert</h2>

            {!selectedMarket ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Market</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a market..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  autoFocus
                />

                {searchResults && searchResults.data.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                    {searchResults.data.map((market) => (
                      <button
                        key={market.id}
                        onClick={() => {
                          setSelectedMarket(market);
                          setSearchQuery("");
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <p className="truncate">{market.question}</p>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length > 2 && searchResults?.data.length === 0 && (
                  <p className="mt-2 text-gray-500 text-center py-4">No markets found</p>
                )}

                {searchQuery.length <= 2 && searchQuery.length > 0 && (
                  <p className="mt-2 text-gray-500 text-center py-4">Type at least 3 characters to search</p>
                )}
              </div>
            ) : (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Selected Market</p>
                  <p className="truncate font-medium">{selectedMarket.question}</p>
                </div>
                <button
                  onClick={() => setSelectedMarket(null)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Change
                </button>
              </div>
            )}

            {selectedMarket && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Alert Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={() => setAlertType("price_move")}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        alertType === "price_move"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Price Move
                    </button>
                    <button
                      onClick={() => setAlertType("volume_spike")}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        alertType === "volume_spike"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Volume Spike
                    </button>
                    <button
                      onClick={() => setAlertType("resolution_approaching")}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        alertType === "resolution_approaching"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Resolution
                    </button>
                    <button
                      onClick={() => setAlertType("liquidity_drop")}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        alertType === "liquidity_drop"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Liquidity Drop
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Condition</label>

                  {alertType === "price_move" && (
                    <div className="flex gap-4 items-center">
                      <select
                        value={priceDirection}
                        onChange={(e) => setPriceDirection(e.target.value as "above" | "below")}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="above">Goes above</option>
                        <option value="below">Goes below</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={priceThreshold}
                        onChange={(e) => setPriceThreshold(e.target.value)}
                        className="w-24 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-600 dark:text-gray-400">
                        ({(parseFloat(priceThreshold || "0") * 100).toFixed(0)}%)
                      </span>
                    </div>
                  )}

                  {alertType === "volume_spike" && (
                    <div className="flex gap-4 items-center">
                      <span>Volume exceeds</span>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={volumeMultiplier}
                        onChange={(e) => setVolumeMultiplier(e.target.value)}
                        className="w-24 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-600 dark:text-gray-400">x average</span>
                    </div>
                  )}

                  {alertType === "resolution_approaching" && (
                    <div className="flex gap-4 items-center">
                      <span>Alert me</span>
                      <select
                        value={hoursBeforeEnd}
                        onChange={(e) => setHoursBeforeEnd(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="1">1 hour</option>
                        <option value="4">4 hours</option>
                        <option value="24">24 hours</option>
                        <option value="48">2 days</option>
                        <option value="168">1 week</option>
                      </select>
                      <span className="text-gray-600 dark:text-gray-400">before resolution</span>
                    </div>
                  )}

                  {alertType === "liquidity_drop" && (
                    <div className="flex gap-4 items-center">
                      <span>Liquidity drops by</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={liquidityDropPercent}
                        onChange={(e) => setLiquidityDropPercent(e.target.value)}
                        className="w-24 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-600 dark:text-gray-400">%</span>
                    </div>
                  )}
                </div>

                {(alertType === "volume_spike" || alertType === "liquidity_drop") && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Time Window</label>
                    <select
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="3600">1 hour</option>
                      <option value="14400">4 hours</option>
                      <option value="86400">24 hours</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedMarket || createMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create Alert"}
              </button>
            </div>

            {createMutation.isError && (
              <p className="mt-2 text-red-600 text-sm">
                Error: {(createMutation.error as Error).message}
              </p>
            )}
          </div>
        )}

        {/* Inbox Tab */}
        {activeTab === "inbox" && (
          <div>
            {/* Inbox Header */}
            {notificationsData && notificationsData.notifications.length > 0 && (
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            )}

            {/* Loading */}
            {notificationsLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
                <p className="mt-2 text-gray-500">Loading notifications...</p>
              </div>
            )}

            {/* Empty State */}
            {notificationsData && notificationsData.notifications.length === 0 && (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-gray-500 mb-4">No notifications yet</p>
                <p className="text-sm text-gray-400">
                  Create alerts to get notified about market changes
                </p>
              </div>
            )}

            {/* Notifications List */}
            {notificationsData && notificationsData.notifications.length > 0 && (
              <div className="space-y-2">
                {notificationsData.notifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.read
                        ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <NotificationIcon type={notification.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {notification.message}
                        </p>
                        {notification.marketQuestion && (
                          <Link
                            href={`/markets/${notification.marketId}`}
                            className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block truncate max-w-full"
                          >
                            {notification.marketQuestion}
                          </Link>
                        )}
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markReadMutation.mutate(notification.id)}
                          disabled={markReadMutation.isPending}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Mark as read"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div>
            {/* Status Filter */}
            <div className="mb-6 flex gap-2">
              {["all", "active", "triggered", "dismissed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Loading State */}
            {(isLoading || authLoading) && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
                <p className="mt-2 text-gray-500">Loading alerts...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
                Error loading alerts: {(error as Error).message}
              </div>
            )}

            {/* Empty State */}
            {alerts && alerts.length === 0 && (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 mb-4">
                  {statusFilter === "all"
                    ? "You don't have any alerts yet."
                    : `No ${statusFilter} alerts.`}
                </p>
                {statusFilter === "all" && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Alert
                  </button>
                )}
              </div>
            )}

            {/* Alerts List */}
            {alerts && alerts.length > 0 && (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-4">
                        <Link
                          href={`/markets/${alert.marketId}`}
                          className="font-medium hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                        >
                          {alert.marketQuestion}
                        </Link>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs rounded ${getTypeBadge(alert.type)}`}>
                          {alert.type.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded capitalize ${getStatusBadge(alert.status)}`}>
                          {alert.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {formatCondition(alert.condition)}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        Created {formatDate(alert.createdAt)}
                        {alert.triggeredAt && (
                          <span className="ml-4 text-yellow-600 dark:text-yellow-400">
                            Triggered {formatDate(alert.triggeredAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {alert.status === "active" && (
                          <button
                            onClick={() => dismissMutation.mutate(alert.id)}
                            disabled={dismissMutation.isPending}
                            className="text-gray-600 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(alert.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
