"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface Alert {
  id: string;
  type: "price" | "volume" | "trader" | "signal" | "custom";
  marketId?: string;
  marketQuestion?: string;
  condition: string;
  value: number;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  enabled: boolean;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [alertType, setAlertType] = useState<Alert["type"]>("price");

  // Fetch user's alerts
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_URL}/api/alerts`, {
          credentials: "include",
        });
        if (response.ok) {
          return response.json();
        }
      } catch (error) {
        console.log("Alerts API not available yet");
      }

      // Return empty array to show empty state
      return [];
    },
    refetchInterval: 30000, // Check every 30s
  });

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "price":
        return "💵";
      case "volume":
        return "📊";
      case "trader":
        return "👤";
      case "signal":
        return "🎯";
      case "custom":
        return "⚡";
      default:
        return "🔔";
    }
  };

  const getAlertColor = (type: Alert["type"]) => {
    switch (type) {
      case "price":
        return "teal";
      case "volume":
        return "blue";
      case "trader":
        return "amber";
      case "signal":
        return "purple";
      case "custom":
        return "pink";
      default:
        return "gray";
    }
  };

  const formatAlertDescription = (alert: Alert) => {
    if (alert.type === "price" && alert.marketQuestion) {
      return `${alert.marketQuestion} - Price ${alert.condition} ${(alert.value * 100).toFixed(0)}¢`;
    }
    if (alert.type === "trader") {
      return `Elite trader places bet > $${alert.value.toLocaleString()}`;
    }
    if (alert.type === "signal") {
      return `New elite signal with confidence > ${alert.value}%`;
    }
    return "Custom alert condition";
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <main className="min-h-screen bg-[#0a0f14] p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              Smart <span className="text-teal-400">Alerts</span>
            </h1>
            <Link
              href="/home"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              ← Back
            </Link>
          </div>
          <p className="text-gray-400">
            Never miss a trading opportunity with intelligent alerts
          </p>
        </div>

        {/* Alert Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl p-6">
            <div className="text-white/80 text-sm mb-2">Active Alerts</div>
            <div className="text-3xl font-bold text-white">
              {alerts?.filter((a) => a.enabled).length || 0}
            </div>
          </div>

          <div className="bg-[#1a2332] border border-amber-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Triggered Today</div>
            <div className="text-3xl font-bold text-white">
              {alerts?.filter((a) => a.triggered).length || 0}
            </div>
          </div>

          <div className="bg-[#1a2332] border border-purple-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Alert Types</div>
            <div className="text-3xl font-bold text-white">
              {[...new Set(alerts?.map((a) => a.type))].length || 0}
            </div>
          </div>
        </div>

        {/* Create Alert Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Alert
          </button>
        </div>

        {/* Alert Templates */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Alert Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="p-4 bg-gray-900/50 border border-teal-500/30 rounded-lg hover:border-teal-500 transition-colors text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💵</span>
                <span className="text-white font-medium">Price Target</span>
              </div>
              <p className="text-gray-400 text-sm">Alert when market reaches specific price</p>
            </button>

            <button className="p-4 bg-gray-900/50 border border-amber-500/30 rounded-lg hover:border-amber-500 transition-colors text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👤</span>
                <span className="text-white font-medium">Elite Trader</span>
              </div>
              <p className="text-gray-400 text-sm">Alert when whale makes large bet</p>
            </button>

            <button className="p-4 bg-gray-900/50 border border-purple-500/30 rounded-lg hover:border-purple-500 transition-colors text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎯</span>
                <span className="text-white font-medium">New Signal</span>
              </div>
              <p className="text-gray-400 text-sm">Alert on high-confidence AI signals</p>
            </button>

            <button className="p-4 bg-gray-900/50 border border-blue-500/30 rounded-lg hover:border-blue-500 transition-colors text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📊</span>
                <span className="text-white font-medium">Volume Spike</span>
              </div>
              <p className="text-gray-400 text-sm">Alert on unusual trading activity</p>
            </button>
          </div>
        </div>

        {/* Active Alerts List */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Your Alerts</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                All
              </button>
              <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                Active
              </button>
              <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                Triggered
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading alerts...</p>
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const color = getAlertColor(alert.type);
                return (
                  <div
                    key={alert.id}
                    className={`p-4 bg-gray-900/50 border rounded-lg hover:border-${color}-500/50 transition-colors ${
                      alert.triggered
                        ? `border-green-500/30 bg-green-500/5`
                        : `border-gray-700`
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                          <div>
                            <div className="text-white font-medium">
                              {formatAlertDescription(alert)}
                            </div>
                            <div className="text-gray-500 text-sm mt-1">
                              Created {formatDate(alert.createdAt)}
                              {alert.triggered && alert.triggeredAt && (
                                <> • Triggered {formatDate(alert.triggeredAt)}</>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.triggered && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                            Triggered
                          </span>
                        )}
                        <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                          <svg
                            className="w-5 h-5 text-gray-400 hover:text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">No Alerts Yet</h3>
              <p className="text-gray-400 text-sm mb-4">
                Create your first alert to stay on top of market opportunities
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
              >
                Create Alert
              </button>
            </div>
          )}
        </div>

        {/* Premium Upgrade Banner */}
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">
                Upgrade to Premium for Advanced Alerts 🔔
              </h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>✨ Unlimited custom alerts</li>
                <li>✨ Multi-condition logic (AND/OR rules)</li>
                <li>✨ Telegram & SMS notifications</li>
                <li>✨ Alert analytics & performance tracking</li>
              </ul>
            </div>
            <button className="px-6 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>

      {/* Create Alert Modal (Placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create New Alert</h3>
            <p className="text-gray-400 mb-6">Alert builder coming soon!</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
