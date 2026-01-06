// Behavior Clustering Types

export type BehaviorClusterType =
  | "scheduled_event"    // Elections, earnings, known dates
  | "continuous_info"    // Ongoing geopolitical, evolving situations
  | "binary_catalyst"    // Single event triggers resolution
  | "high_volatility"    // Jumpy, news-driven markets
  | "long_duration"      // Months away, slow-moving
  | "sports_scheduled";  // Sports events with known timing

export type BehaviorDimensions = {
  infoCadence: number;           // 0-100: How often new info arrives
  infoStructure: number;         // 0-100: Scheduled vs unstructured
  liquidityStability: number;    // 0-100: How stable is liquidity
  timeToResolution: number;      // 0-100: Minutes (0) to months (100)
  participantConcentration: number; // 0-100: Distributed vs concentrated
};

export type MarketInput = {
  marketId: string;
  question: string;
  category: string | null;
  endDate: Date | null;
  // Historical metrics (if available)
  avgSpread?: number | null;
  spreadVariance?: number | null;
  avgVolume24h?: number | null;
  volumeVariance?: number | null;
  priceVolatility?: number | null;
  uniqueTraders?: number | null;
  tradeCount?: number | null;
};

export type ClusterResult = {
  marketId: string;
  dimensions: BehaviorDimensions;
  cluster: BehaviorClusterType;
  clusterLabel: string;
  confidence: number;
  explanation: string;
  whyBullets: Array<{
    text: string;
    metric: string;
    value: number;
    unit?: string;
  }>;
  computedAt: Date;
};

// Cluster definitions with criteria
export type ClusterDefinition = {
  type: BehaviorClusterType;
  label: string;
  description: string;
  // Dimension ranges that match this cluster (min, max)
  criteria: {
    infoCadence?: [number, number];
    infoStructure?: [number, number];
    liquidityStability?: [number, number];
    timeToResolution?: [number, number];
    participantConcentration?: [number, number];
  };
  // Keywords in question that boost this cluster
  keywords: string[];
  // Categories that boost this cluster
  categories: string[];
};
