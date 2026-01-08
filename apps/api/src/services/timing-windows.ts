import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

// ============================================================================
// TIMING WINDOWS SERVICE
// ============================================================================

export type WindowType = "dead_zone" | "danger_window" | "final_positioning" | "opportunity_window";

export interface TimingWindow {
  windowType: WindowType;
  startsAt: string;
  endsAt: string;
  reason: string;
  retailGuidance: string;
}

export interface CurrentTimingWindow {
  marketId: string;
  currentWindow: TimingWindow | null;
  upcomingWindows: TimingWindow[];
  timeUntilResolution: number | null; // hours
  guidance: {
    shouldEnter: boolean;
    shouldExit: boolean;
    waitFor: string | null;
    reasoning: string;
  };
}

/**
 * Analyze timing windows for a market
 */
export async function analyzeTimingWindows(
  marketId: string,
  endDate: string | null,
  currentPrice: number | null,
  category: string | null
): Promise<CurrentTimingWindow> {
  const now = new Date();
  const resolutionDate = endDate ? new Date(endDate) : null;
  
  // Calculate time until resolution
  const timeUntilResolution = resolutionDate 
    ? Math.max(0, (resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    : null;

  // Generate timing windows based on market characteristics
  const windows = generateTimingWindows(marketId, resolutionDate, category, currentPrice);
  
  // Store windows in database (for future reference and learning)
  await storeTimingWindows(marketId, windows);

  // Find current window
  const currentWindow = windows.find(w => {
    const start = new Date(w.startsAt);
    const end = new Date(w.endsAt);
    return now >= start && now <= end;
  }) || null;

  // Find upcoming windows
  const upcomingWindows = windows
    .filter(w => new Date(w.startsAt) > now)
    .slice(0, 3);

  // Generate guidance
  const guidance = generateGuidance(currentWindow, timeUntilResolution, currentPrice);

  return {
    marketId,
    currentWindow,
    upcomingWindows,
    timeUntilResolution,
    guidance,
  };
}

/**
 * Generate timing windows based on market characteristics
 */
function generateTimingWindows(
  marketId: string,
  resolutionDate: Date | null,
  category: string | null,
  currentPrice: number | null
): TimingWindow[] {
  const windows: TimingWindow[] = [];
  const now = new Date();

  if (!resolutionDate) {
    // For markets without clear resolution date, provide general guidance
    windows.push({
      windowType: "opportunity_window",
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      reason: "No fixed resolution date - continuous trading opportunity",
      retailGuidance: "Monitor news catalysts and enter on significant price moves",
    });
    return windows;
  }

  const hoursUntilResolution = (resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysUntilResolution = hoursUntilResolution / 24;

  // Generate windows based on time until resolution
  if (daysUntilResolution > 30) {
    // More than 30 days out - DEAD ZONE
    windows.push({
      windowType: "dead_zone",
      startsAt: now.toISOString(),
      endsAt: new Date(resolutionDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      reason: "Too far from resolution - low information flow and wide spreads",
      retailGuidance: "Avoid entering now. Price rarely moves meaningfully this far out. Wait for catalysts or final positioning window.",
    });

    // 30-7 days out - OPPORTUNITY WINDOW
    windows.push({
      windowType: "opportunity_window",
      startsAt: new Date(resolutionDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(resolutionDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reason: "Information starts flowing, but spreads still reasonable",
      retailGuidance: "Good time to build positions. Spreads are tighter and catalysts become more frequent.",
    });
  } else if (daysUntilResolution > 7) {
    // 7-30 days out - OPPORTUNITY WINDOW
    windows.push({
      windowType: "opportunity_window",
      startsAt: now.toISOString(),
      endsAt: new Date(resolutionDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reason: "Sweet spot - good information flow with reasonable spreads",
      retailGuidance: "Ideal entry window. Market is active but not yet frenzied. Build your position here.",
    });
  }

  if (daysUntilResolution <= 30) {
    // 7-2 days out - FINAL POSITIONING
    windows.push({
      windowType: "final_positioning",
      startsAt: new Date(resolutionDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(resolutionDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      reason: "Smart money takes final positions before volatility spike",
      retailGuidance: "Last chance for size. After this, spreads widen and slippage increases dramatically.",
    });

    // Final 48 hours - DANGER WINDOW
    windows.push({
      windowType: "danger_window",
      startsAt: new Date(resolutionDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: resolutionDate.toISOString(),
      reason: "Extreme volatility, wide spreads, and high slippage",
      retailGuidance: "Extremely dangerous for new entries. Only trade if you have strong conviction and use limit orders. Most retail losses occur here.",
    });
  }

  // Add category-specific windows
  const categoryWindows = getCategorySpecificWindows(category, resolutionDate, now);
  windows.push(...categoryWindows);

  // Sort by start time
  return windows.sort((a, b) => 
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
}

/**
 * Get category-specific timing windows
 */
function getCategorySpecificWindows(
  category: string | null,
  resolutionDate: Date,
  now: Date
): TimingWindow[] {
  const windows: TimingWindow[] = [];
  const categoryLower = category?.toLowerCase() || "";

  // Election markets - debate/poll windows
  if (categoryLower.includes("politics") || categoryLower.includes("election")) {
    // Opportunity after major debates (example: 3 days after debate)
    const debateDate = new Date(resolutionDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    if (debateDate > now) {
      windows.push({
        windowType: "opportunity_window",
        startsAt: debateDate.toISOString(),
        endsAt: new Date(debateDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        reason: "Post-debate clarity - market reprices based on performance",
        retailGuidance: "Major debates create volatility and opportunity. Wait 24h for dust to settle, then enter.",
      });
    }
  }

  // Economic data releases
  if (categoryLower.includes("economics") || categoryLower.includes("fed")) {
    // Opportunity before data release
    const dataReleaseDate = new Date(resolutionDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    if (dataReleaseDate > now) {
      windows.push({
        windowType: "opportunity_window",
        startsAt: new Date(dataReleaseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: dataReleaseDate.toISOString(),
        reason: "Pre-data positioning - market prices in expectations",
        retailGuidance: "Enter 24-48h before release. After release, move is done and spreads blow out.",
      });
    }
  }

  // Sports - line movement windows
  if (categoryLower.includes("sports")) {
    // Best value 3-5 days before game
    const optimalDate = new Date(resolutionDate.getTime() - 4 * 24 * 60 * 60 * 1000);
    if (optimalDate > now) {
      windows.push({
        windowType: "opportunity_window",
        startsAt: new Date(optimalDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(optimalDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        reason: "Optimal line value - before sharp money moves lines",
        retailGuidance: "Best odds appear 3-5 days out. Closer to game time, sharp money moves lines.",
      });
    }
  }

  return windows;
}

/**
 * Generate trading guidance based on current window
 */
function generateGuidance(
  currentWindow: TimingWindow | null,
  timeUntilResolution: number | null,
  currentPrice: number | null
): {
  shouldEnter: boolean;
  shouldExit: boolean;
  waitFor: string | null;
  reasoning: string;
} {
  if (!currentWindow) {
    return {
      shouldEnter: false,
      shouldExit: false,
      waitFor: "Next opportunity window",
      reasoning: "Market is between timing windows. Wait for better entry opportunity.",
    };
  }

  switch (currentWindow.windowType) {
    case "dead_zone":
      return {
        shouldEnter: false,
        shouldExit: false,
        waitFor: "Opportunity window (when market approaches resolution)",
        reasoning: "Dead zone - price rarely moves and spreads are wide. Most retail losses happen from boredom trading here.",
      };

    case "opportunity_window":
      return {
        shouldEnter: true,
        shouldExit: false,
        waitFor: null,
        reasoning: "Ideal entry window. Good information flow, reasonable spreads, and time to adjust if wrong.",
      };

    case "final_positioning":
      return {
        shouldEnter: true,
        shouldExit: false,
        waitFor: null,
        reasoning: "Last chance for size before danger window. Enter now if you have conviction, but be ready for volatility.",
      };

    case "danger_window":
      const hoursLeft = timeUntilResolution || 0;
      if (hoursLeft < 6) {
        return {
          shouldEnter: false,
          shouldExit: true,
          waitFor: null,
          reasoning: "Extreme danger - less than 6 hours to resolution. Exit if you can, or hold to resolution. DO NOT enter new positions.",
        };
      }
      return {
        shouldEnter: false,
        shouldExit: false,
        waitFor: null,
        reasoning: "High risk window. Only enter with strong conviction and limit orders. Expect 2-5x normal slippage.",
      };

    default:
      return {
        shouldEnter: false,
        shouldExit: false,
        waitFor: null,
        reasoning: "Unknown window type - exercise caution.",
      };
  }
}

/**
 * Store timing windows in database
 */
async function storeTimingWindows(marketId: string, windows: TimingWindow[]): Promise<void> {
  try {
    // Delete existing windows for this market
    await db.execute(
      sql`DELETE FROM timing_windows WHERE market_id = ${marketId}`
    );

    // Insert new windows
    for (const window of windows) {
      await db.execute(
        sql`
          INSERT INTO timing_windows (market_id, window_type, starts_at, ends_at, reason, retail_guidance)
          VALUES (${marketId}, ${window.windowType}, ${window.startsAt}, ${window.endsAt}, ${window.reason}, ${window.retailGuidance})
        `
      );
    }
  } catch (error) {
    console.error("[TIMING] Failed to store timing windows:", error);
    // Don't throw - this is not critical for the response
  }
}

