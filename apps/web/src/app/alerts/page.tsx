"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAlerts, getMarkets, createAlert, dismissAlert, deleteAlert } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type AlertCondition =
  | { type: "price_move"; direction: "above" | "below"; threshold: number }
  | { type: "volume_spike"; multiplier: number; timeWindow: number }
  | { type: "liquidity_drop"; dropPercent: number; timeWindow: number };

interface Alert {
  id: string;
  marketId: string;
  marketQuestion: string;
  type: "price_move" | "volume_spike" | "liquidity_drop";
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

export default function AlertsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [alertType, setAlertType] = useState<"price_move" | "volume_spike" | "liquidity_drop">("price_move");
  const [priceDirection, setPriceDirection] = useState<"above" | "below">("above");
  const [priceThreshold, setPriceThreshold] = useState("0.5");
  const [volumeMultiplier, setVolumeMultiplier] = useState("2");
  const [liquidityDropPercent, setLiquidityDropPercent] = useState("20");
  const [timeWindow, setTimeWindow] = useState("3600");

  const queryClient = useQueryClient();

  const { data: alerts, isLoading, error } = useQuery<Alert[]>({
    queryKey: ["alerts", statusFilter],
    queryFn: () => getAlerts(statusFilter) as Promise<Alert[]>,
    enabled: isAuthenticated,
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

  // Redirect to login if not authenticated - use useEffect to avoid render-time side effects
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

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

  const resetForm = () => {
    setShowCreateForm(false);
    setSearchQuery("");
    setSelectedMarket(null);
    setAlertType("price_move");
    setPriceDirection("above");
    setPriceThreshold("0.5");
    setVolumeMultiplier("2");
    setLiquidityDropPercent("20");
    setTimeWindow("3600");
  };

  // Show loading while checking auth or if not authenticated (will redirect)
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCondition = (condition: AlertCondition) => {
    if (condition.type === "price_move") {
      return `Price ${condition.direction} ${(condition.threshold * 100).toFixed(0)}%`;
    } else if (condition.type === "volume_spike") {
      return `Volume ${condition.multiplier}x spike`;
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Alerts</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Get notified when market conditions change
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Alert
            </button>
          </div>
        </header>

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

        {/* Create Alert Form */}
        {showCreateForm && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Create New Alert</h2>

            {/* Market Selection */}
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
                {/* Alert Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Alert Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAlertType("price_move")}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        alertType === "price_move"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Price Move
                    </button>
                    <button
                      onClick={() => setAlertType("volume_spike")}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        alertType === "volume_spike"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Volume Spike
                    </button>
                    <button
                      onClick={() => setAlertType("liquidity_drop")}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        alertType === "liquidity_drop"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      Liquidity Drop
                    </button>
                  </div>
                </div>

                {/* Alert Condition */}
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
                      {alert.type.replace("_", " ")}
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
    </main>
  );
}
