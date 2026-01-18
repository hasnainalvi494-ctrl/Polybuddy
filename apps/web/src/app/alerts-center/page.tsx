"use client";

import { useState, useEffect } from "react";

interface Alert {
  id: string;
  alertType: string;
  alertName: string;
  description?: string;
  priority: "critical" | "high" | "medium" | "low";
  isActive: boolean;
  triggerCount: number;
  triggersLast24h: number;
  unreadTriggers: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

interface Notification {
  id: string;
  alertType: string;
  alertName: string;
  title: string;
  message: string;
  priority: string;
  triggeredAt: string;
  minutesAgo: number;
  isRead: boolean;
}

interface NotificationPreferences {
  notificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  inAppEnabled: boolean;
  telegramEnabled: boolean;
  minPriority: string;
  maxAlertsPerHour: number;
  maxAlertsPerDay: number;
}

const ALERT_TYPES = [
  { value: "best_bet", label: "Best Bet Opportunities", icon: "⭐" },
  { value: "elite_trader", label: "Elite Trader Movements", icon: "👑" },
  { value: "price_alert", label: "Price Alerts", icon: "📊" },
  { value: "arbitrage", label: "Arbitrage Opportunities", icon: "💰" },
  { value: "risk_management", label: "Risk Management", icon: "⚠️" },
  { value: "whale_activity", label: "Whale Activity", icon: "🐋" },
  { value: "pattern_match", label: "Pattern Matches", icon: "🤖" },
];

const PRIORITY_COLORS = {
  critical: "bg-red-500/20 border-red-500 text-red-300",
  high: "bg-orange-500/20 border-orange-500 text-orange-300",
  medium: "bg-yellow-500/20 border-yellow-500 text-yellow-300",
  low: "bg-blue-500/20 border-blue-500 text-blue-300",
};

export default function AlertsCenterPage() {
  const [activeTab, setActiveTab] = useState<"alerts" | "notifications" | "preferences">("alerts");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userAddress = "0x1234567890abcdef"; // Mock user address

  useEffect(() => {
    if (activeTab === "alerts") {
      fetchAlerts();
    } else if (activeTab === "notifications") {
      fetchNotifications();
    } else if (activeTab === "preferences") {
      fetchPreferences();
    }
  }, [activeTab]);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/alerts-system?userAddress=${userAddress}`
      );
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/alerts-system/notifications?userAddress=${userAddress}`
      );
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/alerts-system/preferences?userAddress=${userAddress}`
      );
      if (!response.ok) throw new Error("Failed to fetch preferences");
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (alertId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/alerts-system/${alertId}/toggle`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Failed to toggle alert");
      fetchAlerts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm("Are you sure you want to delete this alert?")) return;
    
    try {
      const response = await fetch(
        `http://localhost:3001/api/alerts-system/${alertId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete alert");
      fetchAlerts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/alerts-system/notifications/mark-read?userAddress=${userAddress}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggerIds: notificationIds }),
        }
      );
      if (!response.ok) throw new Error("Failed to mark as read");
      fetchNotifications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/alerts-system/preferences`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress, ...updates }),
        }
      );
      if (!response.ok) throw new Error("Failed to update preferences");
      fetchPreferences();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatTimeAgo = (minutes: number) => {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${Math.floor(minutes)}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔔 Alerts Center
          </h1>
          <p className="text-gray-300">
            Manage your trading opportunity notifications
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "alerts"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            📋 My Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-6 py-3 rounded-lg font-medium transition-all relative ${
              activeTab === "notifications"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            🔔 Notifications
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "preferences"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            ⚙️ Preferences
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Active Alerts</h2>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                + Create Alert
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : alerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-6 rounded-lg border-2 ${
                      alert.isActive
                        ? "bg-gray-800 border-gray-700"
                        : "bg-gray-800/50 border-gray-700/50 opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {ALERT_TYPES.find((t) => t.value === alert.alertType)?.icon || "🔔"}
                          </span>
                          <h3 className="text-xl font-bold text-white">
                            {alert.alertName}
                          </h3>
                        </div>
                        {alert.description && (
                          <p className="text-gray-400 text-sm mb-2">
                            {alert.description}
                          </p>
                        )}
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            PRIORITY_COLORS[alert.priority]
                          }`}
                        >
                          {alert.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleAlert(alert.id)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            alert.isActive
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                          }`}
                        >
                          {alert.isActive ? "Active" : "Paused"}
                        </button>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                      <div>
                        <div className="text-sm text-gray-400">Total Triggers</div>
                        <div className="text-xl font-bold text-white">
                          {alert.triggerCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Last 24h</div>
                        <div className="text-xl font-bold text-purple-400">
                          {alert.triggersLast24h}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Unread</div>
                        <div className="text-xl font-bold text-yellow-400">
                          {alert.unreadTriggers}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <div className="text-6xl mb-4">🔔</div>
                <p className="text-gray-400 text-lg">No alerts configured yet</p>
                <button className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                  Create Your First Alert
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Recent Notifications</h2>
              {notifications.filter((n) => !n.isRead).length > 0 && (
                <button
                  onClick={() =>
                    markAsRead(notifications.filter((n) => !n.isRead).map((n) => n.id))
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 rounded-lg border-2 ${
                      notification.isRead
                        ? "bg-gray-800/50 border-gray-700/50"
                        : "bg-gray-800 border-purple-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              PRIORITY_COLORS[notification.priority as keyof typeof PRIORITY_COLORS]
                            }`}
                          >
                            {notification.priority.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-400">
                            {formatTimeAgo(notification.minutesAgo)}
                          </span>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {notification.title}
                        </h3>
                        <p className="text-gray-300">{notification.message}</p>
                        <div className="mt-2 text-sm text-gray-400">
                          {notification.alertName} • {notification.alertType}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead([notification.id])}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-400 text-lg">No notifications yet</p>
              </div>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && preferences && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Notification Preferences
            </h2>

            <div className="space-y-6">
              {/* Global Settings */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Global Settings
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <span className="text-white">Enable Notifications</span>
                    <input
                      type="checkbox"
                      checked={preferences.notificationsEnabled}
                      onChange={(e) =>
                        updatePreferences({ notificationsEnabled: e.target.checked })
                      }
                      className="w-5 h-5"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <span className="text-white">Quiet Hours</span>
                    <input
                      type="checkbox"
                      checked={preferences.quietHoursEnabled}
                      onChange={(e) =>
                        updatePreferences({ quietHoursEnabled: e.target.checked })
                      }
                      className="w-5 h-5"
                    />
                  </label>
                </div>
              </div>

              {/* Channels */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Notification Channels
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <span className="text-white">📱 In-App Notifications</span>
                    <input
                      type="checkbox"
                      checked={preferences.inAppEnabled}
                      onChange={(e) =>
                        updatePreferences({ inAppEnabled: e.target.checked })
                      }
                      className="w-5 h-5"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <span className="text-white">📲 Telegram Alerts</span>
                    <input
                      type="checkbox"
                      checked={preferences.telegramEnabled}
                      onChange={(e) =>
                        updatePreferences({ telegramEnabled: e.target.checked })
                      }
                      className="w-5 h-5"
                    />
                  </label>
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Minimum Priority
                </h3>
                <select
                  value={preferences.minPriority}
                  onChange={(e) => updatePreferences({ minPriority: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="low">All Alerts (Low+)</option>
                  <option value="medium">Medium Priority+</option>
                  <option value="high">High Priority+</option>
                  <option value="critical">Critical Only</option>
                </select>
              </div>

              {/* Rate Limits */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Rate Limits
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Max Alerts per Hour
                    </label>
                    <input
                      type="number"
                      value={preferences.maxAlertsPerHour}
                      onChange={(e) =>
                        updatePreferences({
                          maxAlertsPerHour: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Max Alerts per Day
                    </label>
                    <input
                      type="number"
                      value={preferences.maxAlertsPerDay}
                      onChange={(e) =>
                        updatePreferences({
                          maxAlertsPerDay: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
