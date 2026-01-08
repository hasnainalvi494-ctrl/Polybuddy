import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

// ============================================================================
// OUTCOME PATH ANALYSIS SERVICE
// ============================================================================

export interface OutcomePattern {
  patternName: string;
  frequencyPercent: number;
  description: string;
  retailImplication: string;
}

export interface OutcomePathAnalysis {
  marketId: string;
  clusterType: string;
  patterns: OutcomePattern[];
  summary: {
    mostCommonPath: string;
    retailTrapFrequency: number;
    keyTiming: string;
  };
  recommendations: string[];
}

/**
 * Analyze outcome paths for a market based on its cluster type
 */
export async function analyzeOutcomePaths(
  marketId: string,
  marketCategory: string | null,
  marketQuestion: string
): Promise<OutcomePathAnalysis> {
  // Determine cluster type from market characteristics
  const clusterType = determineClusterType(marketCategory, marketQuestion);

  // Fetch patterns from database
  const patterns = await fetchPatternsForCluster(clusterType);

  // Generate summary and recommendations
  const summary = generateSummary(patterns, clusterType);
  const recommendations = generateRecommendations(patterns, clusterType);

  return {
    marketId,
    clusterType,
    patterns,
    summary,
    recommendations,
  };
}

/**
 * Determine cluster type based on market characteristics
 */
function determineClusterType(category: string | null, question: string): string {
  const questionLower = question.toLowerCase();
  const categoryLower = category?.toLowerCase() || "";

  // Election markets
  if (
    questionLower.includes("election") ||
    questionLower.includes("president") ||
    questionLower.includes("trump") ||
    questionLower.includes("biden") ||
    categoryLower.includes("politics")
  ) {
    return "election";
  }

  // Economic/Fed markets
  if (
    questionLower.includes("fed") ||
    questionLower.includes("rate") ||
    questionLower.includes("inflation") ||
    questionLower.includes("gdp") ||
    questionLower.includes("recession") ||
    categoryLower.includes("economics")
  ) {
    return "economic";
  }

  // Crypto markets
  if (
    questionLower.includes("bitcoin") ||
    questionLower.includes("btc") ||
    questionLower.includes("ethereum") ||
    questionLower.includes("eth") ||
    questionLower.includes("crypto") ||
    categoryLower.includes("crypto")
  ) {
    return "crypto";
  }

  // Sports markets
  if (
    questionLower.includes("nba") ||
    questionLower.includes("nfl") ||
    questionLower.includes("mlb") ||
    questionLower.includes("nhl") ||
    questionLower.includes("super bowl") ||
    questionLower.includes("world series") ||
    categoryLower.includes("sports")
  ) {
    return "sports";
  }

  // Geopolitical markets
  if (
    questionLower.includes("war") ||
    questionLower.includes("conflict") ||
    questionLower.includes("sanction") ||
    questionLower.includes("treaty") ||
    questionLower.includes("diplomatic") ||
    categoryLower.includes("geopolitics")
  ) {
    return "geopolitical";
  }

  // Tech/Product markets
  if (
    questionLower.includes("launch") ||
    questionLower.includes("release") ||
    questionLower.includes("earnings") ||
    questionLower.includes("ipo") ||
    questionLower.includes("product") ||
    categoryLower.includes("tech")
  ) {
    return "tech";
  }

  // Default to economic for general markets
  return "economic";
}

/**
 * Fetch patterns for a specific cluster type
 */
async function fetchPatternsForCluster(clusterType: string): Promise<OutcomePattern[]> {
  const result = await db.execute(
    sql`
      SELECT 
        pattern_name,
        frequency_percent,
        description,
        retail_implication
      FROM outcome_patterns
      WHERE cluster_type = ${clusterType}
      ORDER BY frequency_percent DESC
    `
  );

  return result.rows.map((row: any) => ({
    patternName: row.pattern_name,
    frequencyPercent: parseFloat(row.frequency_percent),
    description: row.description,
    retailImplication: row.retail_implication,
  }));
}

/**
 * Generate summary of outcome paths
 */
function generateSummary(
  patterns: OutcomePattern[],
  clusterType: string
): { mostCommonPath: string; retailTrapFrequency: number; keyTiming: string } {
  if (patterns.length === 0) {
    return {
      mostCommonPath: "Insufficient historical data",
      retailTrapFrequency: 0,
      keyTiming: "Unknown",
    };
  }

  const mostCommon = patterns[0];
  
  // Calculate retail trap frequency (patterns where retail loses)
  const retailTrapCount = patterns.filter(p => 
    p.retailImplication.toLowerCase().includes("retail") &&
    (p.retailImplication.toLowerCase().includes("miss") ||
     p.retailImplication.toLowerCase().includes("exit") ||
     p.retailImplication.toLowerCase().includes("lose") ||
     p.retailImplication.toLowerCase().includes("wrong"))
  ).length;
  
  const retailTrapFrequency = Math.round((retailTrapCount / patterns.length) * 100);

  // Generate key timing based on cluster type
  const keyTiming = getKeyTiming(clusterType, patterns);

  return {
    mostCommonPath: mostCommon.patternName,
    retailTrapFrequency,
    keyTiming,
  };
}

/**
 * Get key timing insights for cluster type
 */
function getKeyTiming(clusterType: string, patterns: OutcomePattern[]): string {
  const timingMap: Record<string, string> = {
    election: "Final 48-72 hours see highest volatility and opportunity",
    economic: "Position before data releases; market moves on announcement",
    crypto: "Peak hype 2-3 months before event; fade the narrative",
    sports: "Line value best 3-5 days before game; avoid day-of moves",
    geopolitical: "Initial panic creates best entry; fade crisis premium",
    tech: "Earnings patterns repeat quarterly; anticipate seasonal trends",
  };

  return timingMap[clusterType] || "Monitor key catalysts and position accordingly";
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(patterns: OutcomePattern[], clusterType: string): string[] {
  const recommendations: string[] = [];

  // Add cluster-specific recommendations
  const clusterRecs = getClusterRecommendations(clusterType);
  recommendations.push(...clusterRecs);

  // Add pattern-specific recommendations
  if (patterns.length > 0) {
    const topPattern = patterns[0];
    
    if (topPattern.frequencyPercent > 25) {
      recommendations.push(
        `⚠️ ${topPattern.patternName} occurs in ${topPattern.frequencyPercent}% of similar markets - plan for this scenario`
      );
    }

    // Check for timing-related patterns
    const hasTimingPattern = patterns.some(p => 
      p.description.toLowerCase().includes("final") ||
      p.description.toLowerCase().includes("late") ||
      p.description.toLowerCase().includes("before")
    );

    if (hasTimingPattern) {
      recommendations.push(
        "⏰ Timing is critical - avoid early positions unless you have strong conviction"
      );
    }

    // Check for volatility patterns
    const hasVolatilityPattern = patterns.some(p =>
      p.description.toLowerCase().includes("whipsaw") ||
      p.description.toLowerCase().includes("oscillate") ||
      p.description.toLowerCase().includes("volatile")
    );

    if (hasVolatilityPattern) {
      recommendations.push(
        "📊 Expect high volatility - use limit orders and avoid market orders"
      );
    }
  }

  return recommendations;
}

/**
 * Get cluster-specific recommendations
 */
function getClusterRecommendations(clusterType: string): string[] {
  const recMap: Record<string, string[]> = {
    election: [
      "📈 Wait for final polls before major positions",
      "🎯 Focus on swing state data, not national polls",
      "⚡ Be ready to exit quickly in final 24 hours",
    ],
    economic: [
      "📊 Position before data releases, not after",
      "🔍 Watch Fed speaker calendar for signals",
      "💡 Market prices in changes weeks early",
    ],
    crypto: [
      "⏰ Sell the news, not the hype",
      "📉 Expect 30-40% drawdowns post-event",
      "🎯 Enter on panic, exit on euphoria",
    ],
    sports: [
      "🏀 Fade public favorites, back value underdogs",
      "📊 Ignore recent form, focus on fundamentals",
      "⏰ Best lines appear 3-5 days before game",
    ],
    geopolitical: [
      "💥 Initial panic creates best opportunities",
      "📉 Markets adapt quickly to 'new normal'",
      "🎯 Fade extreme scenarios, bet on stability",
    ],
    tech: [
      "📈 Quarterly patterns repeat - use history",
      "⚠️ Launch hype rarely matches reality",
      "🔍 Watch adoption data, not announcements",
    ],
  };

  return recMap[clusterType] || [
    "📊 Study historical patterns before entering",
    "⏰ Timing matters - don't rush into positions",
    "🎯 Have clear entry and exit criteria",
  ];
}

