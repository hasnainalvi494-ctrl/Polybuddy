import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots, retailSignals, marketRelations, constraintChecks, walletFlowEvents } from "@polybuddy/db";
import { eq, and, desc, sql, gte, isNotNull, or, lte } from "drizzle-orm";

// ============================================
// TYPES
// ============================================

const WhyBulletSchema = z.object({
  text: z.string(),
  metric: z.string(),
  value: z.number(),
  unit: z.string().optional(),
});

const RetailSignalSchema = z.object({
  id: z.string().uuid(),
  marketId: z.string().uuid(),
  signalType: z.enum([
    "favorable_structure",
    "structural_mispricing",
    "crowd_chasing",
    "event_window",
    "retail_friendliness",
  ]),
  label: z.string(),
  isFavorable: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]),
  whyBullets: z.array(WhyBulletSchema),
  metrics: z.record(z.unknown()).nullable(),
  computedAt: z.string(),
});

type WhyBullet = z.infer<typeof WhyBulletSchema>;

// ============================================
// SIGNAL TYPE 1: FAVORABLE MARKET STRUCTURE
// ============================================

type FavorableStructureMetrics = {
  spreadPct: number;
  depthUsd: number;
  stabilityScore: number;
  hoursToResolution: number | null;
};

function computeFavorableStructureSignal(
  market: {
    id: string;
    endDate: Date | null;
  },
  snapshot: {
    spread: number | null;
    depth: number | null;
    price: number | null;
    volume24h: number | null;
  }
): {
  label: string;
  isFavorable: boolean;
  confidence: "low" | "medium" | "high";
  whyBullets: WhyBullet[];
  metrics: FavorableStructureMetrics;
} | null {
  // Need minimum data
  if (!snapshot.spread && !snapshot.depth) return null;

  const spreadPct = snapshot.spread ? snapshot.spread * 100 : 10; // Default high if unknown
  const depthUsd = snapshot.depth || 0;
  const volume = snapshot.volume24h || 0;

  // Calculate stability score (price stability relative to volume)
  // Higher volume with lower price volatility = more stable
  const stabilityScore = volume > 0
    ? Math.min(100, Math.max(0, 50 + (depthUsd / volume) * 50))
    : 50;

  // Hours to resolution
  const now = new Date();
  const hoursToResolution = market.endDate
    ? (market.endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    : null;

  // Scoring criteria
  const isTightSpread = spreadPct < 3;
  const hasSufficientDepth = depthUsd > 5000;
  const isStable = stabilityScore > 60;
  const hasLongHorizon = hoursToResolution === null || hoursToResolution > 72;

  // Count favorable conditions
  const favorableCount = [isTightSpread, hasSufficientDepth, isStable, hasLongHorizon]
    .filter(Boolean).length;

  const isFavorable = favorableCount >= 3;

  // Confidence based on how clear-cut the metrics are
  let confidence: "low" | "medium" | "high" = "medium";
  if (favorableCount >= 4 || favorableCount <= 1) {
    confidence = "high";
  } else if (favorableCount === 2) {
    confidence = "low";
  }

  const label = isFavorable
    ? "Favorable Setup: Low Friction"
    : "Unfavorable: High Friction";

  const whyBullets: WhyBullet[] = [
    {
      text: isTightSpread
        ? `Tight spread of ${spreadPct.toFixed(1)}% minimizes entry/exit costs`
        : `Wide spread of ${spreadPct.toFixed(1)}% increases execution costs`,
      metric: "spread",
      value: spreadPct,
      unit: "%",
    },
    {
      text: hasSufficientDepth
        ? `Depth of $${(depthUsd / 1000).toFixed(1)}K supports position sizes without slippage`
        : `Limited depth of $${(depthUsd / 1000).toFixed(1)}K may cause slippage`,
      metric: "depth",
      value: depthUsd,
      unit: "USD",
    },
    {
      text: isStable
        ? `Stability score of ${stabilityScore.toFixed(0)} indicates steady pricing`
        : `Stability score of ${stabilityScore.toFixed(0)} suggests price volatility`,
      metric: "stability",
      value: stabilityScore,
    },
  ];

  return {
    label,
    isFavorable,
    confidence,
    whyBullets,
    metrics: {
      spreadPct,
      depthUsd,
      stabilityScore,
      hoursToResolution,
    },
  };
}

// ============================================
// SIGNAL TYPE 2: STRUCTURAL MISPRICING
// ============================================

type StructuralMispricingMetrics = {
  relatedMarketCount: number;
  inconsistentPairs: number;
  avgPriceGap: number;
  maxPriceGap: number;
  avgConsistencyScore: number;
};

async function computeStructuralMispricingSignal(
  marketId: string,
  marketQuestion: string
): Promise<{
  label: string;
  isFavorable: boolean;
  confidence: "low" | "medium" | "high";
  whyBullets: WhyBullet[];
  metrics: StructuralMispricingMetrics;
} | null> {
  // Find related markets through market_relations
  const relations = await db
    .select({
      id: marketRelations.id,
      aMarketId: marketRelations.aMarketId,
      bMarketId: marketRelations.bMarketId,
      relationType: marketRelations.relationType,
    })
    .from(marketRelations)
    .where(
      or(
        eq(marketRelations.aMarketId, marketId),
        eq(marketRelations.bMarketId, marketId)
      )
    );

  if (relations.length === 0) {
    return null; // No related markets to compare
  }

  // Get latest consistency checks for these relations
  const relationIds = relations.map((r) => r.id);
  const checks = await db
    .select()
    .from(constraintChecks)
    .where(sql`${constraintChecks.relationId} IN ${relationIds}`)
    .orderBy(desc(constraintChecks.ts));

  // Dedupe by relation (keep most recent)
  const checkMap = new Map<string, typeof checks[0]>();
  for (const check of checks) {
    if (!checkMap.has(check.relationId)) {
      checkMap.set(check.relationId, check);
    }
  }

  const latestChecks = Array.from(checkMap.values());

  if (latestChecks.length === 0) {
    return null; // No consistency data
  }

  // Count inconsistencies
  const inconsistentChecks = latestChecks.filter(
    (c) => c.label === "potential_inconsistency_medium" || c.label === "potential_inconsistency_high"
  );

  // Calculate average consistency score
  const avgConsistencyScore = latestChecks.reduce((sum, c) => sum + c.score, 0) / latestChecks.length;

  // Extract price gaps from whyJson
  let avgPriceGap = 0;
  let maxPriceGap = 0;
  for (const check of latestChecks) {
    const why = check.whyJson as { priceGap?: number }[] | null;
    if (Array.isArray(why)) {
      for (const w of why) {
        if (typeof w.priceGap === "number") {
          avgPriceGap += Math.abs(w.priceGap);
          maxPriceGap = Math.max(maxPriceGap, Math.abs(w.priceGap));
        }
      }
    }
  }
  if (latestChecks.length > 0) {
    avgPriceGap = avgPriceGap / latestChecks.length;
  }

  const hasSignificantInconsistency = inconsistentChecks.length > 0;
  const hasLargePriceGap = maxPriceGap > 0.1; // > 10% gap

  // Determine signal
  let label: string;
  let isFavorable: boolean;
  let confidence: "low" | "medium" | "high";

  if (hasSignificantInconsistency || hasLargePriceGap) {
    isFavorable = true;
    label = avgConsistencyScore < 50
      ? "Odds Elevated vs Similar Markets"
      : "Odds Compressed vs Similar Markets";
    confidence = inconsistentChecks.length >= 2 ? "high" : maxPriceGap > 0.15 ? "high" : "medium";
  } else {
    isFavorable = false;
    label = "Pricing Consistent with Related Markets";
    confidence = avgConsistencyScore > 70 ? "high" : "medium";
  }

  const whyBullets: WhyBullet[] = [
    {
      text: `${relations.length} related market${relations.length > 1 ? "s" : ""} identified for comparison`,
      metric: "related_markets",
      value: relations.length,
    },
    {
      text: hasSignificantInconsistency
        ? `${inconsistentChecks.length} potential inconsistenc${inconsistentChecks.length > 1 ? "ies" : "y"} detected`
        : `No significant inconsistencies detected across ${latestChecks.length} checks`,
      metric: "inconsistencies",
      value: inconsistentChecks.length,
    },
    {
      text: maxPriceGap > 0
        ? `Max price gap of ${(maxPriceGap * 100).toFixed(1)}% vs related markets`
        : `Consistency score of ${avgConsistencyScore.toFixed(0)} indicates aligned pricing`,
      metric: maxPriceGap > 0 ? "price_gap" : "consistency_score",
      value: maxPriceGap > 0 ? maxPriceGap * 100 : avgConsistencyScore,
      unit: "%",
    },
  ];

  return {
    label,
    isFavorable,
    confidence,
    whyBullets,
    metrics: {
      relatedMarketCount: relations.length,
      inconsistentPairs: inconsistentChecks.length,
      avgPriceGap: avgPriceGap * 100,
      maxPriceGap: maxPriceGap * 100,
      avgConsistencyScore,
    },
  };
}

// ============================================
// SIGNAL TYPE 3: CROWD CHASING / LATE ENTRY RISK
// ============================================

type CrowdChasingMetrics = {
  priceMove4h: number;
  newWalletPct: number;
  earlyTraderPersistence: number;
  reversionRate: number;
};

async function computeCrowdChasingSignal(
  marketId: string
): Promise<{
  label: string;
  isFavorable: boolean;
  confidence: "low" | "medium" | "high";
  whyBullets: WhyBullet[];
  metrics: CrowdChasingMetrics;
} | null> {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get snapshots for price movement calculation
  const recentSnapshots = await db
    .select({
      price: marketSnapshots.price,
      snapshotAt: marketSnapshots.snapshotAt,
    })
    .from(marketSnapshots)
    .where(
      and(
        eq(marketSnapshots.marketId, marketId),
        gte(marketSnapshots.snapshotAt, twentyFourHoursAgo)
      )
    )
    .orderBy(desc(marketSnapshots.snapshotAt))
    .limit(50);

  if (recentSnapshots.length < 2) {
    return null; // Not enough data
  }

  // Calculate 4h price movement
  const latestPrice = recentSnapshots[0]?.price ? Number(recentSnapshots[0].price) : null;
  const fourHourSnapshot = recentSnapshots.find(
    (s) => s.snapshotAt && s.snapshotAt <= fourHoursAgo
  );
  const fourHourPrice = fourHourSnapshot?.price ? Number(fourHourSnapshot.price) : null;

  let priceMove4h = 0;
  if (latestPrice !== null && fourHourPrice !== null && fourHourPrice > 0) {
    priceMove4h = ((latestPrice - fourHourPrice) / fourHourPrice) * 100;
  }

  // Get wallet flow events to analyze trader composition
  const flowEvents = await db
    .select({
      walletAddress: walletFlowEvents.walletAddress,
      startTs: walletFlowEvents.startTs,
      notional: walletFlowEvents.notional,
      side: walletFlowEvents.side,
    })
    .from(walletFlowEvents)
    .where(
      and(
        eq(walletFlowEvents.marketId, marketId),
        gte(walletFlowEvents.startTs, twentyFourHoursAgo)
      )
    )
    .orderBy(desc(walletFlowEvents.startTs));

  // Analyze wallet composition
  const uniqueWallets = new Set(flowEvents.map((e) => e.walletAddress));
  const recentWallets = new Set(
    flowEvents
      .filter((e) => e.startTs && e.startTs >= fourHoursAgo)
      .map((e) => e.walletAddress)
  );
  const earlyWallets = new Set(
    flowEvents
      .filter((e) => e.startTs && e.startTs < fourHoursAgo)
      .map((e) => e.walletAddress)
  );

  // New wallet percentage (wallets only appearing in last 4h)
  const newWallets = [...recentWallets].filter((w) => !earlyWallets.has(w));
  const newWalletPct = recentWallets.size > 0 ? (newWallets.length / recentWallets.size) * 100 : 0;

  // Early trader persistence (how many early traders are still active)
  const persistingEarly = [...earlyWallets].filter((w) => recentWallets.has(w));
  const earlyTraderPersistence = earlyWallets.size > 0
    ? (persistingEarly.length / earlyWallets.size) * 100
    : 100;

  // Historical reversion pattern (simplified: check if price swings back)
  // Look at 24h price range and current position in range
  const prices = recentSnapshots
    .map((s) => (s.price ? Number(s.price) : null))
    .filter((p): p is number => p !== null);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;
  const currentPosInRange = priceRange > 0 && latestPrice !== null
    ? ((latestPrice - minPrice) / priceRange) * 100
    : 50;

  // Reversion rate based on position in range
  // If at extreme (>80% or <20%), higher reversion probability
  const reversionRate = currentPosInRange > 80 || currentPosInRange < 20 ? 65 : 35;

  // Determine if crowd chasing is detected
  const isLargeMove = Math.abs(priceMove4h) > 10;
  const isNewWalletDominated = newWalletPct > 50;
  const isWeakPersistence = earlyTraderPersistence < 30;
  const isHighReversion = reversionRate > 50;

  const crowdChasingScore = [isLargeMove, isNewWalletDominated, isWeakPersistence, isHighReversion]
    .filter(Boolean).length;

  const isCrowdChasing = crowdChasingScore >= 2;

  let label: string;
  let isFavorable: boolean;
  let confidence: "low" | "medium" | "high";

  if (isCrowdChasing) {
    isFavorable = false;
    label = "Crowd Chasing Detected";
    confidence = crowdChasingScore >= 3 ? "high" : "medium";
  } else {
    isFavorable = true;
    label = "Organic Movement";
    confidence = crowdChasingScore === 0 ? "high" : "medium";
  }

  const whyBullets: WhyBullet[] = [
    {
      text: isLargeMove
        ? `Large ${priceMove4h > 0 ? "upward" : "downward"} move of ${Math.abs(priceMove4h).toFixed(1)}% in 4 hours`
        : `Price moved ${Math.abs(priceMove4h).toFixed(1)}% in 4 hours — within normal range`,
      metric: "price_move_4h",
      value: Math.abs(priceMove4h),
      unit: "%",
    },
    {
      text: isNewWalletDominated
        ? `${newWalletPct.toFixed(0)}% of recent traders are new participants (FOMO indicator)`
        : `${newWalletPct.toFixed(0)}% new participants — organic trader mix`,
      metric: "new_wallet_pct",
      value: newWalletPct,
      unit: "%",
    },
    {
      text: isHighReversion
        ? `Reversion probability ${reversionRate}% based on position in 24h range`
        : `Low reversion probability (${reversionRate}%) — price may hold`,
      metric: "reversion_rate",
      value: reversionRate,
      unit: "%",
    },
  ];

  return {
    label,
    isFavorable,
    confidence,
    whyBullets,
    metrics: {
      priceMove4h,
      newWalletPct,
      earlyTraderPersistence,
      reversionRate,
    },
  };
}

// ============================================
// SIGNAL TYPE 4: EVENT WINDOW OPENING
// ============================================

type EventWindowMetrics = {
  hoursUntilEvent: number | null;
  historicalMoveAvg: number;
  currentStability: number;
  eventType: string | null;
};

async function computeEventWindowSignal(
  marketId: string,
  market: {
    endDate: Date | null;
    category: string | null;
    clusterLabel: string | null;
  }
): Promise<{
  label: string;
  isFavorable: boolean;
  confidence: "low" | "medium" | "high";
  whyBullets: WhyBullet[];
  metrics: EventWindowMetrics;
} | null> {
  const now = new Date();

  // Need an end date to determine event timing
  if (!market.endDate) {
    return null;
  }

  const hoursUntilEnd = (market.endDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Only generate signal if event is within a reasonable window (1-168 hours)
  if (hoursUntilEnd <= 0 || hoursUntilEnd > 168) {
    return null;
  }

  // Get recent snapshots to measure current stability
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentSnapshots = await db
    .select({
      price: marketSnapshots.price,
      snapshotAt: marketSnapshots.snapshotAt,
    })
    .from(marketSnapshots)
    .where(
      and(
        eq(marketSnapshots.marketId, marketId),
        gte(marketSnapshots.snapshotAt, oneWeekAgo)
      )
    )
    .orderBy(desc(marketSnapshots.snapshotAt))
    .limit(100);

  if (recentSnapshots.length < 5) {
    return null; // Not enough data
  }

  // Calculate stability (standard deviation of prices)
  const prices = recentSnapshots
    .map((s) => (s.price ? Number(s.price) : null))
    .filter((p): p is number => p !== null);

  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Stability score: lower stdDev = higher stability (0-100)
  const currentStability = Math.max(0, Math.min(100, 100 - stdDev * 500));

  // Determine event type based on cluster label or category
  const eventType = market.clusterLabel || market.category || "unknown";

  // Historical move average based on event type (simplified heuristics)
  let historicalMoveAvg = 10; // Default 10%
  if (market.clusterLabel === "scheduled_event" || market.clusterLabel === "sports_scheduled") {
    historicalMoveAvg = 25; // Scheduled events often have big moves
  } else if (market.clusterLabel === "binary_catalyst") {
    historicalMoveAvg = 35; // Binary catalysts can swing hard
  } else if (market.clusterLabel === "high_volatility") {
    historicalMoveAvg = 20;
  }

  // Determine if this is an actionable window
  const isNearEvent = hoursUntilEnd <= 48;
  const isStable = currentStability > 60;
  const hasHistoricalPattern = historicalMoveAvg > 15;

  const isActionableWindow = isNearEvent && isStable && hasHistoricalPattern;

  let label: string;
  let isFavorable: boolean;
  let confidence: "low" | "medium" | "high";

  if (isActionableWindow) {
    isFavorable = true;
    label = "Information Window Approaching";
    confidence = hoursUntilEnd <= 12 ? "high" : hoursUntilEnd <= 24 ? "medium" : "low";
  } else if (isNearEvent && !isStable) {
    isFavorable = false;
    label = "Event Approaching — Already Volatile";
    confidence = "medium";
  } else {
    isFavorable = false;
    label = "No Imminent Catalyst Window";
    confidence = "low";
  }

  // Format hours for display
  const hoursDisplay = hoursUntilEnd < 1
    ? `${Math.round(hoursUntilEnd * 60)} minutes`
    : hoursUntilEnd < 24
    ? `${Math.round(hoursUntilEnd)} hours`
    : `${Math.round(hoursUntilEnd / 24)} days`;

  const whyBullets: WhyBullet[] = [
    {
      text: `Resolution in ${hoursDisplay} — ${isNearEvent ? "repricing window opening" : "time to position"}`,
      metric: "hours_until_event",
      value: hoursUntilEnd,
      unit: "hours",
    },
    {
      text: `Historical moves of ${historicalMoveAvg}% typical for ${eventType} markets`,
      metric: "historical_move_avg",
      value: historicalMoveAvg,
      unit: "%",
    },
    {
      text: isStable
        ? `Current stability score ${currentStability.toFixed(0)} — price consolidating before event`
        : `Stability score ${currentStability.toFixed(0)} — already pricing in volatility`,
      metric: "stability",
      value: currentStability,
    },
  ];

  return {
    label,
    isFavorable,
    confidence,
    whyBullets,
    metrics: {
      hoursUntilEvent: hoursUntilEnd,
      historicalMoveAvg,
      currentStability,
      eventType,
    },
  };
}

// ============================================
// SIGNAL TYPE 5: RETAIL-FRIENDLY VS UNFRIENDLY
// ============================================

type RetailFriendlinessMetrics = {
  hoursToResolution: number | null;
  volatilityScore: number;
  repriceSpeed: number;
  professionalDominance: number;
};

async function computeRetailFriendlinessSignal(
  marketId: string,
  market: {
    endDate: Date | null;
    spread: number | null;
    depth: number | null;
    volatilityScore: string | null;
  }
): Promise<{
  label: string;
  isFavorable: boolean;
  confidence: "low" | "medium" | "high";
  whyBullets: WhyBullet[];
  metrics: RetailFriendlinessMetrics;
} | null> {
  const now = new Date();

  // Calculate hours to resolution
  const hoursToResolution = market.endDate
    ? (market.endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    : null;

  // Get recent snapshots to measure volatility and reprice speed
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const recentSnapshots = await db
    .select({
      price: marketSnapshots.price,
      spread: marketSnapshots.spread,
      snapshotAt: marketSnapshots.snapshotAt,
    })
    .from(marketSnapshots)
    .where(
      and(
        eq(marketSnapshots.marketId, marketId),
        gte(marketSnapshots.snapshotAt, twoHoursAgo)
      )
    )
    .orderBy(desc(marketSnapshots.snapshotAt))
    .limit(20);

  // Calculate volatility from price changes
  const prices = recentSnapshots
    .map((s) => (s.price ? Number(s.price) : null))
    .filter((p): p is number => p !== null);

  let volatilityScore = 50; // Default medium
  if (prices.length >= 2) {
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(Math.abs(prices[i]! - prices[i - 1]!) / prices[i - 1]!);
    }
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    volatilityScore = Math.min(100, avgChange * 1000); // Scale to 0-100
  }

  // Or use stored volatility score
  if (market.volatilityScore) {
    volatilityScore = Number(market.volatilityScore);
  }

  // Calculate reprice speed (how fast price moves)
  let repriceSpeed = 50;
  if (recentSnapshots.length >= 2) {
    const firstSnapshot = recentSnapshots[recentSnapshots.length - 1];
    const lastSnapshot = recentSnapshots[0];
    if (firstSnapshot?.snapshotAt && lastSnapshot?.snapshotAt && firstSnapshot.price && lastSnapshot.price) {
      const timeSpan = (lastSnapshot.snapshotAt.getTime() - firstSnapshot.snapshotAt.getTime()) / (60 * 1000); // minutes
      const priceChange = Math.abs(Number(lastSnapshot.price) - Number(firstSnapshot.price));
      repriceSpeed = timeSpan > 0 ? Math.min(100, (priceChange / timeSpan) * 10000) : 50;
    }
  }

  // Estimate professional dominance
  // Tight spreads + high volume + fast moves = pros
  const spreadTight = market.spread ? Number(market.spread) < 0.02 : false;
  const depthHigh = market.depth ? Number(market.depth) > 50000 : false;
  const professionalDominance = (spreadTight ? 30 : 0) + (depthHigh ? 20 : 0) + (repriceSpeed > 60 ? 30 : 0) + (volatilityScore > 60 ? 20 : 0);

  // Determine friendliness
  const isShortHorizon = hoursToResolution !== null && hoursToResolution < 48;
  const isHighVolatility = volatilityScore > 60;
  const isFastRepricing = repriceSpeed > 60;
  const isProDominated = professionalDominance > 60;

  const unfriendlyFactors = [isShortHorizon, isHighVolatility, isFastRepricing, isProDominated]
    .filter(Boolean).length;

  const isFriendly = unfriendlyFactors <= 1;

  let label: string;
  let confidence: "low" | "medium" | "high";

  if (isFriendly) {
    label = "Retail-Friendly Structure";
    confidence = unfriendlyFactors === 0 ? "high" : "medium";
  } else {
    label = "Retail-Unfriendly Structure";
    confidence = unfriendlyFactors >= 3 ? "high" : "medium";
  }

  const whyBullets: WhyBullet[] = [
    {
      text: isShortHorizon
        ? `Short horizon (${hoursToResolution?.toFixed(0)}h) favors traders with real-time execution`
        : hoursToResolution
        ? `Longer horizon (${Math.round(hoursToResolution / 24)} days) allows time to enter/exit`
        : "No deadline pressure — time to position thoughtfully",
      metric: "hours_to_resolution",
      value: hoursToResolution || 0,
      unit: "hours",
    },
    {
      text: isHighVolatility
        ? `High volatility (${volatilityScore.toFixed(0)}) requires quick reactions`
        : `Low volatility (${volatilityScore.toFixed(0)}) allows patient execution`,
      metric: "volatility",
      value: volatilityScore,
    },
    {
      text: isProDominated
        ? `Market shows ${professionalDominance}% professional characteristics — sophisticated competition`
        : `Professional dominance score ${professionalDominance}% — retail can compete`,
      metric: "pro_dominance",
      value: professionalDominance,
      unit: "%",
    },
  ];

  return {
    label,
    isFavorable: isFriendly,
    confidence,
    whyBullets,
    metrics: {
      hoursToResolution,
      volatilityScore,
      repriceSpeed,
      professionalDominance,
    },
  };
}

// ============================================
// ROUTES
// ============================================

export const retailSignalsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Get favorable structure signal for a market
  typedApp.get(
    "/markets/:marketId/favorable-structure",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: RetailSignalSchema.nullable(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check for cached signal (within last hour)
      const existingSignal = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            eq(retailSignals.signalType, "favorable_structure"),
            gte(retailSignals.computedAt, new Date(Date.now() - 60 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt))
        .limit(1);

      if (existingSignal.length > 0) {
        const signal = existingSignal[0]!;
        return {
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        };
      }

      // Get market data
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get latest snapshot
      const latestSnapshot = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, marketId))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      const snapshot = latestSnapshot[0];
      if (!snapshot) {
        return null; // No data to compute signal
      }

      const result = computeFavorableStructureSignal(
        { id: market.id, endDate: market.endDate },
        {
          spread: snapshot.spread ? Number(snapshot.spread) : null,
          depth: snapshot.depth ? Number(snapshot.depth) : null,
          price: snapshot.price ? Number(snapshot.price) : null,
          volume24h: snapshot.volume24h ? Number(snapshot.volume24h) : null,
        }
      );

      if (!result) {
        return null;
      }

      // Store the computed signal
      const [newSignal] = await db
        .insert(retailSignals)
        .values({
          marketId,
          signalType: "favorable_structure",
          label: result.label,
          isFavorable: result.isFavorable,
          confidence: result.confidence,
          whyBullets: result.whyBullets,
          metrics: result.metrics,
          validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000), // Valid for 2 hours
        })
        .returning();

      return {
        id: newSignal!.id,
        marketId: newSignal!.marketId,
        signalType: newSignal!.signalType,
        label: newSignal!.label,
        isFavorable: newSignal!.isFavorable,
        confidence: newSignal!.confidence,
        whyBullets: result.whyBullets,
        metrics: result.metrics,
        computedAt: newSignal!.computedAt?.toISOString() || new Date().toISOString(),
      };
    }
  );

  // Get structural mispricing signal for a market
  typedApp.get(
    "/markets/:marketId/structural-mispricing",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: RetailSignalSchema.nullable(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check for cached signal (within last hour)
      const existingSignal = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            eq(retailSignals.signalType, "structural_mispricing"),
            gte(retailSignals.computedAt, new Date(Date.now() - 60 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt))
        .limit(1);

      if (existingSignal.length > 0) {
        const signal = existingSignal[0]!;
        return {
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        };
      }

      // Get market data
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      const result = await computeStructuralMispricingSignal(marketId, market.question);

      if (!result) {
        return null; // No related markets to compare
      }

      // Store the computed signal
      const [newSignal] = await db
        .insert(retailSignals)
        .values({
          marketId,
          signalType: "structural_mispricing",
          label: result.label,
          isFavorable: result.isFavorable,
          confidence: result.confidence,
          whyBullets: result.whyBullets,
          metrics: result.metrics,
          validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
        })
        .returning();

      return {
        id: newSignal!.id,
        marketId: newSignal!.marketId,
        signalType: newSignal!.signalType,
        label: newSignal!.label,
        isFavorable: newSignal!.isFavorable,
        confidence: newSignal!.confidence,
        whyBullets: result.whyBullets,
        metrics: result.metrics,
        computedAt: newSignal!.computedAt?.toISOString() || new Date().toISOString(),
      };
    }
  );

  // Get crowd chasing signal for a market
  typedApp.get(
    "/markets/:marketId/crowd-chasing",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: RetailSignalSchema.nullable(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check for cached signal (within last 30 minutes for crowd chasing)
      const existingSignal = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            eq(retailSignals.signalType, "crowd_chasing"),
            gte(retailSignals.computedAt, new Date(Date.now() - 30 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt))
        .limit(1);

      if (existingSignal.length > 0) {
        const signal = existingSignal[0]!;
        return {
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        };
      }

      // Check market exists
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      const result = await computeCrowdChasingSignal(marketId);

      if (!result) {
        return null; // Not enough data
      }

      // Store the computed signal
      const [newSignal] = await db
        .insert(retailSignals)
        .values({
          marketId,
          signalType: "crowd_chasing",
          label: result.label,
          isFavorable: result.isFavorable,
          confidence: result.confidence,
          whyBullets: result.whyBullets,
          metrics: result.metrics,
          validUntil: new Date(Date.now() + 1 * 60 * 60 * 1000), // Valid for 1 hour (more dynamic)
        })
        .returning();

      return {
        id: newSignal!.id,
        marketId: newSignal!.marketId,
        signalType: newSignal!.signalType,
        label: newSignal!.label,
        isFavorable: newSignal!.isFavorable,
        confidence: newSignal!.confidence,
        whyBullets: result.whyBullets,
        metrics: result.metrics,
        computedAt: newSignal!.computedAt?.toISOString() || new Date().toISOString(),
      };
    }
  );

  // Get event window signal for a market
  typedApp.get(
    "/markets/:marketId/event-window",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: RetailSignalSchema.nullable(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check for cached signal (within last hour)
      const existingSignal = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            eq(retailSignals.signalType, "event_window"),
            gte(retailSignals.computedAt, new Date(Date.now() - 60 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt))
        .limit(1);

      if (existingSignal.length > 0) {
        const signal = existingSignal[0]!;
        return {
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        };
      }

      // Get market data
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      const result = await computeEventWindowSignal(marketId, {
        endDate: market.endDate,
        category: market.category,
        clusterLabel: market.clusterLabel,
      });

      if (!result) {
        return null; // No event window to track
      }

      // Store the computed signal
      const [newSignal] = await db
        .insert(retailSignals)
        .values({
          marketId,
          signalType: "event_window",
          label: result.label,
          isFavorable: result.isFavorable,
          confidence: result.confidence,
          whyBullets: result.whyBullets,
          metrics: result.metrics,
          validUntil: new Date(Date.now() + 1 * 60 * 60 * 1000),
        })
        .returning();

      return {
        id: newSignal!.id,
        marketId: newSignal!.marketId,
        signalType: newSignal!.signalType,
        label: newSignal!.label,
        isFavorable: newSignal!.isFavorable,
        confidence: newSignal!.confidence,
        whyBullets: result.whyBullets,
        metrics: result.metrics,
        computedAt: newSignal!.computedAt?.toISOString() || new Date().toISOString(),
      };
    }
  );

  // Get retail friendliness signal for a market
  typedApp.get(
    "/markets/:marketId/retail-friendliness",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: RetailSignalSchema.nullable(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check for cached signal (within last hour)
      const existingSignal = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            eq(retailSignals.signalType, "retail_friendliness"),
            gte(retailSignals.computedAt, new Date(Date.now() - 60 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt))
        .limit(1);

      if (existingSignal.length > 0) {
        const signal = existingSignal[0]!;
        return {
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        };
      }

      // Get market data with latest snapshot
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get latest snapshot for spread/depth
      const latestSnapshot = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, marketId))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      const snapshot = latestSnapshot[0];

      const result = await computeRetailFriendlinessSignal(marketId, {
        endDate: market.endDate,
        spread: snapshot?.spread ? Number(snapshot.spread) : null,
        depth: snapshot?.depth ? Number(snapshot.depth) : null,
        volatilityScore: market.volatilityScore,
      });

      if (!result) {
        return null;
      }

      // Store the computed signal
      const [newSignal] = await db
        .insert(retailSignals)
        .values({
          marketId,
          signalType: "retail_friendliness",
          label: result.label,
          isFavorable: result.isFavorable,
          confidence: result.confidence,
          whyBullets: result.whyBullets,
          metrics: result.metrics,
          validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
        })
        .returning();

      return {
        id: newSignal!.id,
        marketId: newSignal!.marketId,
        signalType: newSignal!.signalType,
        label: newSignal!.label,
        isFavorable: newSignal!.isFavorable,
        confidence: newSignal!.confidence,
        whyBullets: result.whyBullets,
        metrics: result.metrics,
        computedAt: newSignal!.computedAt?.toISOString() || new Date().toISOString(),
      };
    }
  );

  // Get all retail signals for a market
  typedApp.get(
    "/markets/:marketId",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        response: {
          200: z.object({
            marketId: z.string().uuid(),
            signals: z.array(RetailSignalSchema),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      // Check market exists
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get all recent signals for this market
      const signals = await db
        .select()
        .from(retailSignals)
        .where(
          and(
            eq(retailSignals.marketId, marketId),
            gte(retailSignals.computedAt, new Date(Date.now() - 2 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(retailSignals.computedAt));

      // Dedupe by signal type (keep most recent)
      const signalMap = new Map<string, typeof signals[0]>();
      for (const signal of signals) {
        if (!signalMap.has(signal.signalType)) {
          signalMap.set(signal.signalType, signal);
        }
      }

      return {
        marketId,
        signals: Array.from(signalMap.values()).map((signal) => ({
          id: signal.id,
          marketId: signal.marketId,
          signalType: signal.signalType,
          label: signal.label,
          isFavorable: signal.isFavorable,
          confidence: signal.confidence,
          whyBullets: signal.whyBullets as WhyBullet[],
          metrics: signal.metrics as Record<string, unknown> | null,
          computedAt: signal.computedAt?.toISOString() || new Date().toISOString(),
        })),
      };
    }
  );
};
