import {
  BehaviorClusterType,
  BehaviorDimensions,
  ClusterDefinition,
  ClusterResult,
  MarketInput,
} from "./types.js";

// Cluster definitions
const CLUSTER_DEFINITIONS: ClusterDefinition[] = [
  {
    type: "scheduled_event",
    label: "Scheduled Event",
    description: "Markets tied to known, scheduled events like elections or earnings",
    criteria: {
      infoStructure: [60, 100],
      timeToResolution: [20, 80],
    },
    keywords: ["election", "vote", "earnings", "announce", "report", "deadline", "meeting", "summit"],
    categories: ["Politics", "Economics", "Business"],
  },
  {
    type: "sports_scheduled",
    label: "Sports / Scheduled",
    description: "Sports events or other scheduled binary outcomes",
    criteria: {
      infoStructure: [70, 100],
      timeToResolution: [0, 50],
    },
    keywords: ["win", "game", "match", "championship", "super bowl", "world cup", "playoff", "finals", "vs", "beat"],
    categories: ["Sports"],
  },
  {
    type: "binary_catalyst",
    label: "Binary Catalyst",
    description: "Single event or decision triggers resolution",
    criteria: {
      infoStructure: [30, 70],
      timeToResolution: [10, 60],
    },
    keywords: ["will", "approve", "pass", "sign", "reject", "decision", "rule", "court", "verdict"],
    categories: ["Politics", "Legal"],
  },
  {
    type: "continuous_info",
    label: "Continuous Info",
    description: "Ongoing situations with continuous information flow",
    criteria: {
      infoCadence: [50, 100],
      infoStructure: [0, 50],
      timeToResolution: [30, 100],
    },
    keywords: ["ongoing", "conflict", "war", "crisis", "situation", "developing", "talks", "negotiations"],
    categories: ["Geopolitics", "World"],
  },
  {
    type: "high_volatility",
    label: "High Volatility",
    description: "Jumpy markets driven by news and sentiment",
    criteria: {
      liquidityStability: [0, 40],
      infoCadence: [40, 100],
    },
    keywords: ["crypto", "bitcoin", "price", "reach", "hit", "above", "below", "by"],
    categories: ["Crypto", "Markets"],
  },
  {
    type: "long_duration",
    label: "Long Duration",
    description: "Markets with resolution months away",
    criteria: {
      timeToResolution: [80, 100],
    },
    keywords: ["2025", "2026", "2027", "year", "decade", "century", "ever"],
    categories: [],
  },
];

// Keywords for detecting sports
const SPORTS_KEYWORDS = [
  "nfl", "nba", "mlb", "nhl", "soccer", "football", "basketball", "baseball",
  "hockey", "tennis", "golf", "ufc", "boxing", "f1", "formula", "race",
  "team", "player", "coach", "league", "season", "championship", "playoff",
  "super bowl", "world series", "stanley cup", "finals",
];

// Keywords for crypto/price markets
const CRYPTO_KEYWORDS = [
  "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "crypto", "token",
  "price", "$", "above", "below", "reach", "hit",
];

/**
 * Compute behavior dimensions from market data
 */
export function computeDimensions(market: MarketInput): BehaviorDimensions {
  const questionLower = market.question.toLowerCase();
  const categoryLower = (market.category || "").toLowerCase();

  // 1. Info Cadence (how often new info arrives)
  let infoCadence = 50; // default
  if (CRYPTO_KEYWORDS.some(k => questionLower.includes(k))) {
    infoCadence = 90; // Crypto has constant info
  } else if (SPORTS_KEYWORDS.some(k => questionLower.includes(k))) {
    infoCadence = 30; // Sports info comes in bursts
  } else if (categoryLower.includes("politic")) {
    infoCadence = 60; // Politics has regular news cycles
  } else if (market.tradeCount && market.tradeCount > 100) {
    infoCadence = Math.min(90, 50 + market.tradeCount / 10);
  }

  // 2. Info Structure (scheduled vs unstructured)
  let infoStructure = 50;
  const scheduledKeywords = ["election", "vote", "earnings", "report", "game", "match", "deadline"];
  if (scheduledKeywords.some(k => questionLower.includes(k))) {
    infoStructure = 85;
  }
  if (SPORTS_KEYWORDS.some(k => questionLower.includes(k))) {
    infoStructure = 90;
  }
  if (questionLower.includes("by") && /\d{4}/.test(market.question)) {
    infoStructure = 70; // Has a date
  }
  if (["ongoing", "crisis", "war", "conflict"].some(k => questionLower.includes(k))) {
    infoStructure = 20;
  }

  // 3. Liquidity Stability
  let liquidityStability = 60; // default
  if (market.spreadVariance !== undefined && market.spreadVariance !== null) {
    liquidityStability = Math.max(0, 100 - market.spreadVariance * 1000);
  }
  if (CRYPTO_KEYWORDS.some(k => questionLower.includes(k))) {
    liquidityStability = Math.min(liquidityStability, 40); // Crypto is volatile
  }
  if (market.avgVolume24h && market.avgVolume24h > 100000) {
    liquidityStability = Math.min(100, liquidityStability + 20);
  }

  // 4. Time to Resolution
  let timeToResolution = 50;
  if (market.endDate) {
    const now = new Date();
    const hoursUntil = (market.endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 1) timeToResolution = 0;
    else if (hoursUntil < 24) timeToResolution = 10;
    else if (hoursUntil < 72) timeToResolution = 20;
    else if (hoursUntil < 168) timeToResolution = 35;
    else if (hoursUntil < 720) timeToResolution = 50; // ~month
    else if (hoursUntil < 2160) timeToResolution = 70; // ~3 months
    else if (hoursUntil < 4320) timeToResolution = 85; // ~6 months
    else timeToResolution = 95;
  }
  // Check for long-term keywords
  if (["2026", "2027", "2028", "2029", "2030"].some(y => market.question.includes(y))) {
    timeToResolution = Math.max(timeToResolution, 90);
  }

  // 5. Participant Concentration
  let participantConcentration = 50;
  if (market.uniqueTraders !== undefined && market.uniqueTraders !== null) {
    if (market.uniqueTraders < 10) participantConcentration = 90;
    else if (market.uniqueTraders < 50) participantConcentration = 70;
    else if (market.uniqueTraders < 200) participantConcentration = 50;
    else participantConcentration = 30;
  }

  return {
    infoCadence: Math.round(Math.max(0, Math.min(100, infoCadence))),
    infoStructure: Math.round(Math.max(0, Math.min(100, infoStructure))),
    liquidityStability: Math.round(Math.max(0, Math.min(100, liquidityStability))),
    timeToResolution: Math.round(Math.max(0, Math.min(100, timeToResolution))),
    participantConcentration: Math.round(Math.max(0, Math.min(100, participantConcentration))),
  };
}

/**
 * Score how well dimensions match a cluster definition
 */
function scoreClusterMatch(dimensions: BehaviorDimensions, cluster: ClusterDefinition): number {
  let score = 0;
  let criteriaCount = 0;

  for (const [dim, range] of Object.entries(cluster.criteria)) {
    if (!range) continue;
    criteriaCount++;
    const value = dimensions[dim as keyof BehaviorDimensions];
    const [min, max] = range;

    if (value >= min && value <= max) {
      // Perfect match
      const midpoint = (min + max) / 2;
      const distance = Math.abs(value - midpoint) / ((max - min) / 2);
      score += 100 - (distance * 30); // Closer to midpoint = higher score
    } else {
      // Outside range - penalize based on distance
      const distance = value < min ? min - value : value - max;
      score += Math.max(0, 50 - distance);
    }
  }

  return criteriaCount > 0 ? score / criteriaCount : 50;
}

/**
 * Classify a market into a behavior cluster
 */
export function classifyBehavior(market: MarketInput): ClusterResult {
  const dimensions = computeDimensions(market);
  const questionLower = market.question.toLowerCase();
  const categoryLower = (market.category || "").toLowerCase();

  // Score each cluster
  const scores: Array<{ cluster: ClusterDefinition; score: number }> = [];

  for (const cluster of CLUSTER_DEFINITIONS) {
    let score = scoreClusterMatch(dimensions, cluster);

    // Boost for keyword matches
    const keywordMatches = cluster.keywords.filter(k => questionLower.includes(k)).length;
    score += keywordMatches * 10;

    // Boost for category matches
    if (cluster.categories.some(c => categoryLower.includes(c.toLowerCase()))) {
      score += 15;
    }

    scores.push({ cluster, score });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0]!;
  const confidence = Math.min(95, Math.max(40, Math.round(best.score)));

  // Generate explanation
  const explanation = generateExplanation(market, dimensions, best.cluster);

  // Generate why bullets
  const whyBullets = generateWhyBullets(dimensions, best.cluster);

  return {
    marketId: market.marketId,
    dimensions,
    cluster: best.cluster.type,
    clusterLabel: best.cluster.label,
    confidence,
    explanation,
    whyBullets,
    computedAt: new Date(),
  };
}

function generateExplanation(
  market: MarketInput,
  dimensions: BehaviorDimensions,
  cluster: ClusterDefinition
): string {
  const parts: string[] = [];

  parts.push(`This market behaves like a ${cluster.label.toLowerCase()} market.`);
  parts.push(cluster.description + ".");

  if (dimensions.timeToResolution < 30) {
    parts.push("Short time horizon means rapid price discovery.");
  } else if (dimensions.timeToResolution > 70) {
    parts.push("Long duration allows for gradual position building.");
  }

  if (dimensions.liquidityStability < 40) {
    parts.push("Expect price swings and variable spreads.");
  }

  return parts.join(" ");
}

function generateWhyBullets(
  dimensions: BehaviorDimensions,
  cluster: ClusterDefinition
): Array<{ text: string; metric: string; value: number; unit?: string }> {
  const bullets: Array<{ text: string; metric: string; value: number; unit?: string }> = [];

  // Time to resolution bullet
  const timeLabels = ["minutes", "hours", "days", "weeks", "months"];
  const timeIndex = Math.floor(dimensions.timeToResolution / 25);
  bullets.push({
    text: `Resolution timeframe: ${timeLabels[Math.min(timeIndex, 4)]}`,
    metric: "Time Score",
    value: dimensions.timeToResolution,
    unit: "/100",
  });

  // Info structure bullet
  const structureLabel = dimensions.infoStructure > 60 ? "scheduled events" : "unstructured news";
  bullets.push({
    text: `Information arrives via ${structureLabel}`,
    metric: "Structure",
    value: dimensions.infoStructure,
    unit: "/100",
  });

  // Liquidity bullet
  const liqLabel = dimensions.liquidityStability > 60 ? "stable" : dimensions.liquidityStability > 30 ? "moderate" : "volatile";
  bullets.push({
    text: `Liquidity conditions are ${liqLabel}`,
    metric: "Stability",
    value: dimensions.liquidityStability,
    unit: "/100",
  });

  return bullets;
}

/**
 * Get cluster display info
 */
export function getClusterDisplayInfo(cluster: BehaviorClusterType): {
  label: string;
  description: string;
  color: string;
  icon: string;
} {
  const info: Record<BehaviorClusterType, { label: string; description: string; color: string; icon: string }> = {
    scheduled_event: {
      label: "Scheduled Event",
      description: "Tied to known dates like elections or earnings",
      color: "blue",
      icon: "calendar",
    },
    continuous_info: {
      label: "Continuous Info",
      description: "Ongoing situation with constant news flow",
      color: "purple",
      icon: "newspaper",
    },
    binary_catalyst: {
      label: "Binary Catalyst",
      description: "Single decision or event triggers resolution",
      color: "orange",
      icon: "lightning",
    },
    high_volatility: {
      label: "High Volatility",
      description: "Jumpy prices driven by sentiment and news",
      color: "red",
      icon: "chart-line",
    },
    long_duration: {
      label: "Long Duration",
      description: "Resolution months or years away",
      color: "green",
      icon: "clock",
    },
    sports_scheduled: {
      label: "Sports / Scheduled",
      description: "Athletic events with known timing",
      color: "teal",
      icon: "trophy",
    },
  };

  return info[cluster];
}
