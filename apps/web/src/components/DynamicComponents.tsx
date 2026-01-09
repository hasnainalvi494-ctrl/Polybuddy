/**
 * Dynamic imports for code splitting
 * These components are loaded on-demand to reduce initial bundle size
 */

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./skeletons/ChartSkeleton";
import { TableSkeleton } from "./skeletons/TableSkeleton";

// Heavy chart components - load on demand
export const DynamicPriceHistoryChart = dynamic(
  () => import("./PriceHistoryChart").then((mod) => ({ default: mod.PriceHistoryChart })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Charts don't need SSR
  }
);

export const DynamicOrderBook = dynamic(
  () => import("./OrderBook").then((mod) => ({ default: mod.OrderBook })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

export const DynamicOutcomePathAnalysis = dynamic(
  () => import("./OutcomePathAnalysis").then((mod) => ({ default: mod.OutcomePathAnalysis })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

// AI Analysis - can be loaded lazily
export const DynamicAIAnalysis = dynamic(
  () => import("./AIAnalysis").then((mod) => ({ default: mod.AIAnalysis })),
  {
    loading: () => (
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-[#1f1f1f] rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-[#1f1f1f] rounded"></div>
          <div className="h-4 bg-[#1f1f1f] rounded w-5/6"></div>
          <div className="h-4 bg-[#1f1f1f] rounded w-4/6"></div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Cross-platform prices
export const DynamicCrossPlatformPrices = dynamic(
  () => import("./CrossPlatformPrices").then((mod) => ({ default: mod.CrossPlatformPrices })),
  {
    loading: () => <TableSkeleton rows={3} columns={4} />,
    ssr: false,
  }
);

// Profit simulator with complex calculations
export const DynamicProfitSimulator = dynamic(
  () => import("./ProfitSimulator").then((mod) => ({ default: mod.ProfitSimulator })),
  {
    loading: () => (
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-[#1f1f1f] rounded w-32 mb-4"></div>
        <div className="h-48 bg-[#1f1f1f] rounded"></div>
      </div>
    ),
    ssr: false,
  }
);

