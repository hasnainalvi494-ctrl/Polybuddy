"use client";

import { useQuery } from "@tanstack/react-query";
import { getWalletExposure, type ExposureCluster } from "@/lib/api";
import { WhyBullets } from "./WhyBullets";
import { useState } from "react";

type HiddenExposureCardProps = {
  walletId: string;
  walletLabel?: string;
};

function ExposureBar({ percentage, isDangerous }: { percentage: number; isDangerous?: boolean }) {
  const getColor = () => {
    if (isDangerous) return "bg-red-500";
    if (percentage >= 50) return "bg-orange-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${getColor()} rounded-full transition-all`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

function ClusterCard({ cluster, isExpanded, onToggle }: {
  cluster: ExposureCluster;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {cluster.label}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
              {cluster.marketCount} market{cluster.marketCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ExposureBar percentage={cluster.exposurePct} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
              {cluster.exposurePct.toFixed(0)}%
            </span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transform transition-transform ml-2 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700/50">
          <div className="pt-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Why grouped together
            </h4>
            <WhyBullets bullets={cluster.whyBullets} />
          </div>

          {cluster.markets.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Markets in cluster
              </h4>
              <ul className="space-y-1 text-sm">
                {cluster.markets.map((m) => (
                  <li key={m.marketId} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                      {m.question}
                    </span>
                    <span className="text-gray-500 dark:text-gray-500 shrink-0">
                      ${m.exposure.toFixed(0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HiddenExposureCard({ walletId, walletLabel }: HiddenExposureCardProps) {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["walletExposure", walletId],
    queryFn: () => getWalletExposure(walletId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Exposure analysis unavailable
        </p>
      </div>
    );
  }

  const toggleCluster = (clusterId: string) => {
    setExpandedCluster(expandedCluster === clusterId ? null : clusterId);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Hidden Exposure Analysis
          </h3>
          {walletLabel && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {walletLabel}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            ${data.totalExposure.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total Exposure
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {data.warning && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            data.isDangerous
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
          }`}
        >
          <div className="flex items-start gap-2">
            <svg
              className={`w-5 h-5 shrink-0 ${
                data.isDangerous ? "text-red-500" : "text-yellow-500"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p
              className={`text-sm ${
                data.isDangerous
                  ? "text-red-700 dark:text-red-400"
                  : "text-yellow-700 dark:text-yellow-400"
              }`}
            >
              {data.warning}
            </p>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {data.diversificationScore}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Diversification
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {data.concentrationRisk}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Concentration
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {data.clusters.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Clusters
          </div>
        </div>
      </div>

      {/* Cluster List */}
      {data.clusters.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Exposure Clusters
          </h4>
          {data.clusters.map((cluster) => (
            <ClusterCard
              key={cluster.clusterId}
              cluster={cluster}
              isExpanded={expandedCluster === cluster.clusterId}
              onToggle={() => toggleCluster(cluster.clusterId)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No positions to analyze
        </p>
      )}
    </div>
  );
}
