"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { getMarket } from "@/lib/api";

interface MarketDetail {
  id: string;
  polymarketId: string;
  question: string;
  description: string | null;
  category: string | null;
  endDate: string | null;
  qualityGrade: string | null;
  qualityScore: number | null;
  currentPrice: number | null;
  volume24h: number | null;
  spread: number | null;
  depth: number | null;
  staleness: number | null;
}

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: market, isLoading, error } = useQuery<MarketDetail>({
    queryKey: ["market", id],
    queryFn: () => getMarket(id) as Promise<MarketDetail>,
    enabled: !!id,
  });

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return `${(price * 100).toFixed(1)}%`;
  };

  const formatVolume = (volume: number | null) => {
    if (volume === null || volume === 0) return "-";
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading market...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading market: {(error as Error).message}
          </div>
        </div>
      </main>
    );
  }

  if (!market) return null;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{market.question}</h1>
          {market.category && (
            <span className="inline-block text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
              {market.category}
            </span>
          )}
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPrice(market.currentPrice)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">24h Volume</p>
            <p className="text-2xl font-bold">{formatVolume(market.volume24h)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Spread</p>
            <p className="text-2xl font-bold">
              {market.spread !== null ? `${(market.spread * 100).toFixed(1)}%` : "-"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Last Update</p>
            <p className="text-2xl font-bold">
              {market.staleness !== null ? `${market.staleness}m ago` : "-"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Market Details</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">End Date</dt>
              <dd className="font-medium">{formatDate(market.endDate)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Polymarket ID</dt>
              <dd className="font-mono text-sm">{market.polymarketId}</dd>
            </div>
            {market.qualityGrade && (
              <div>
                <dt className="text-sm text-gray-500">Quality Grade</dt>
                <dd className="font-medium">
                  <span
                    className={`inline-block px-2 py-0.5 rounded ${
                      market.qualityGrade === "A"
                        ? "bg-green-100 text-green-800"
                        : market.qualityGrade === "B"
                        ? "bg-blue-100 text-blue-800"
                        : market.qualityGrade === "C"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {market.qualityGrade}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {market.description && (
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {market.description}
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t dark:border-gray-700">
          <a
            href={`https://polymarket.com/event/${market.polymarketId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            View on Polymarket &rarr;
          </a>
        </div>
      </div>
    </main>
  );
}
