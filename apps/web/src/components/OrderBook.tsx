"use client";

import { useQuery } from "@tantml:invoke>
<parameter name="query">react-query";
import { getOrderBook, type OrderBookResponse } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface OrderBookProps {
  marketId: string;
}

export function OrderBook({ marketId }: OrderBookProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["orderbook", marketId],
    queryFn: () => getOrderBook(marketId),
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100"></div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Loading order book...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No order book data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Interpretation Summary */}
      <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-100 dark:border-sky-900/30">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-sky-900 dark:text-sky-100 mb-1">
              Order Book Analysis
            </h3>
            <p className="text-sm text-sky-800 dark:text-sky-200">
              {data.interpretation.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Mid Price
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {(data.midPrice * 100).toFixed(1)}¢
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Spread
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {(data.spread * 100).toFixed(2)}¢
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Book Balance
          </div>
          <div className={`text-lg font-bold ${
            data.interpretation.bookBalance === "heavy_bid"
              ? "text-emerald-600 dark:text-emerald-400"
              : data.interpretation.bookBalance === "heavy_ask"
              ? "text-rose-600 dark:text-rose-400"
              : "text-gray-900 dark:text-gray-100"
          }`}>
            {data.interpretation.bookBalance === "heavy_bid"
              ? "Heavy Bid"
              : data.interpretation.bookBalance === "heavy_ask"
              ? "Heavy Ask"
              : "Balanced"}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Total Bids
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.bids[data.bids.length - 1]?.total.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* Depth Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Depth Chart
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={[
              ...data.bids.map((bid) => ({
                price: bid.price,
                bidDepth: bid.total,
                askDepth: 0,
              })).reverse(),
              ...data.asks.map((ask) => ({
                price: ask.price,
                bidDepth: 0,
                askDepth: ask.total,
              })),
            ]}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="price"
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(value) => `${(value * 100).toFixed(1)}¢`}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f3f4f6",
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === "bidDepth" ? "Bid Depth" : "Ask Depth",
              ]}
              labelFormatter={(value) => `Price: ${(value * 100).toFixed(2)}¢`}
            />
            <ReferenceLine
              x={data.midPrice}
              stroke="#fbbf24"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: "Mid Price",
                position: "top",
                fill: "#fbbf24",
                fontSize: 12,
              }}
            />
            <Area
              type="stepAfter"
              dataKey="bidDepth"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#bidGradient)"
            />
            <Area
              type="stepBefore"
              dataKey="askDepth"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#askGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Bids (Buy Orders)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Asks (Sell Orders)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Mid Price</span>
          </div>
        </div>
      </div>

      {/* Large Walls Alert */}
      {data.interpretation.largeWalls.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30">
          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Large Liquidity Walls Detected
          </h4>
          <div className="space-y-2">
            {data.interpretation.largeWalls.map((wall, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm bg-white/50 dark:bg-gray-800/50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    wall.side === "bid"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                  }`}>
                    {wall.side.toUpperCase()}
                  </span>
                  <span className="text-amber-800 dark:text-amber-200">
                    Large wall at <strong>{(wall.price * 100).toFixed(1)}¢</strong>
                  </span>
                </div>
                <div className="text-amber-700 dark:text-amber-300 font-semibold">
                  {wall.percentage}% of depth
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
            Large walls can act as support/resistance levels and may indicate strong buyer/seller interest.
          </p>
        </div>
      )}

      {/* Thin Zones Alert */}
      {data.interpretation.thinZones.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-100 dark:border-rose-900/30">
          <h4 className="font-semibold text-rose-900 dark:text-rose-100 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Thin Zones Detected
          </h4>
          <div className="space-y-2">
            {data.interpretation.thinZones.slice(0, 3).map((zone, index) => (
              <div
                key={index}
                className="text-sm bg-white/50 dark:bg-gray-800/50 rounded-lg p-3"
              >
                <span className="text-rose-800 dark:text-rose-200">
                  Low liquidity between{" "}
                  <strong>{(zone.startPrice * 100).toFixed(1)}¢</strong> and{" "}
                  <strong>{(zone.endPrice * 100).toFixed(1)}¢</strong>
                  {" "}({zone.gap}% gap)
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-3">
            Thin zones indicate low liquidity. Large orders may experience significant slippage in these price ranges.
          </p>
        </div>
      )}

      {/* Order Book Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bids */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
            Bids (Buy Orders)
          </h4>
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-500 dark:text-gray-400 font-medium pb-2 border-b border-gray-200 dark:border-gray-700">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
            {data.bids.slice(0, 10).map((bid, index) => (
              <div
                key={index}
                className="grid grid-cols-3 text-sm py-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded"
              >
                <div className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {(bid.price * 100).toFixed(2)}¢
                </div>
                <div className="text-right text-gray-700 dark:text-gray-300 font-mono">
                  {bid.size.toLocaleString()}
                </div>
                <div className="text-right text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {bid.total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asks */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <h4 className="font-semibold text-rose-600 dark:text-rose-400 mb-3">
            Asks (Sell Orders)
          </h4>
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-500 dark:text-gray-400 font-medium pb-2 border-b border-gray-200 dark:border-gray-700">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
            {data.asks.slice(0, 10).map((ask, index) => (
              <div
                key={index}
                className="grid grid-cols-3 text-sm py-1 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded"
              >
                <div className="text-rose-600 dark:text-rose-400 font-mono">
                  {(ask.price * 100).toFixed(2)}¢
                </div>
                <div className="text-right text-gray-700 dark:text-gray-300 font-mono">
                  {ask.size.toLocaleString()}
                </div>
                <div className="text-right text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {ask.total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Educational Note */}
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <strong>How to read the order book:</strong> The depth chart shows cumulative liquidity at each price level.
        Bids (green) represent buy orders, asks (red) represent sell orders. Large walls indicate significant
        support/resistance. Thin zones show price ranges with low liquidity where slippage may be higher.
      </div>
    </div>
  );
}

