"use client";

export const dynamic = "force-dynamic";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTelegramConnection,
  getTelegramBotInfo,
  disconnectTelegram,
  type TelegramConnection,
} from "@/lib/api";
import { useState } from "react";
import QRCode from "react-qr-code";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const { data: connectionData, isLoading: isLoadingConnection } = useQuery({
    queryKey: ["telegram-connection"],
    queryFn: getTelegramConnection,
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: botInfo, isLoading: isLoadingBotInfo } = useQuery({
    queryKey: ["telegram-bot-info"],
    queryFn: getTelegramBotInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-connection"] });
      setShowDisconnectConfirm(false);
    },
  });

  const connection = connectionData?.connection;
  const isConnected = !!connection;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account preferences and integrations
          </p>
        </header>

        {/* Telegram Integration Section */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-sky-600 dark:text-sky-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Telegram Alerts
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive real-time alerts for price movements, volume spikes, and more
              </p>
            </div>
          </div>

          {isLoadingConnection || isLoadingBotInfo ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </p>
            </div>
          ) : isConnected ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                      Connected
                    </h3>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      Your Telegram account is connected and receiving alerts
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Telegram Username
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    @{connection.telegramUsername || "Not set"}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Connected Since
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(connection.connectedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {!showDisconnectConfirm ? (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  Disconnect Telegram
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-100 dark:border-amber-900/30">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Are you sure? You'll stop receiving all Telegram alerts.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                      className="flex-1 py-2.5 px-4 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {disconnectMutation.isPending ? "Disconnecting..." : "Yes, Disconnect"}
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not Connected State */
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-block bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 mb-4">
                  {botInfo && (
                    <QRCode
                      value={botInfo.botUrl}
                      size={200}
                      level="H"
                      className="mx-auto"
                    />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Scan QR code or follow the instructions below
                </p>
              </div>

              {botInfo && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    How to Connect:
                  </h3>
                  <ol className="space-y-2">
                    {botInfo.instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <span className="flex-1 pt-0.5">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <a
                href={botInfo?.botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium text-center"
              >
                Open Telegram Bot
              </a>
            </div>
          )}
        </section>

        {/* Alert Types Section */}
        {isConnected && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Alert Types
            </h2>
            <div className="space-y-3">
              {[
                {
                  icon: "📈",
                  title: "Price Movements",
                  description: "Get notified when prices move significantly",
                },
                {
                  icon: "💥",
                  title: "Volume Spikes",
                  description: "Alert when trading volume exceeds 2x average",
                },
                {
                  icon: "⚠️",
                  title: "Market Disputes",
                  description: "Know when a market resolution is disputed",
                },
                {
                  icon: "⏰",
                  title: "Resolution Approaching",
                  description: "Reminder when market is about to resolve",
                },
                {
                  icon: "🔄",
                  title: "Flow Guard Changes",
                  description: "Updates on market flow status changes",
                },
              ].map((alertType, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <span className="text-2xl">{alertType.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {alertType.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {alertType.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

