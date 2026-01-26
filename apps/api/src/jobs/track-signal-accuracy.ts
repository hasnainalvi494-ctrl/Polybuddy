/**
 * Signal Accuracy Tracking Job
 * 
 * Monitors resolved markets and updates signal performance metrics.
 * This data is used to:
 * 1. Measure overall signal accuracy
 * 2. Identify which signal sources perform best (whale, momentum, AI)
 * 3. Improve the model over time
 */

import { db, markets, bestBetSignals } from "@polybuddy/db";
import { eq, sql, and, isNull } from "drizzle-orm";

const logger = {
  info: (msg: string) => console.log(`[ACCURACY TRACKER] ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ACCURACY ERROR] ${msg}`, err || ""),
};

interface AccuracyStats {
  totalSignals: number;
  resolvedSignals: number;
  correctPredictions: number;
  accuracyRate: number;
  bySource: {
    whale: { total: number; correct: number; accuracy: number };
    momentum: { total: number; correct: number; accuracy: number };
    combined: { total: number; correct: number; accuracy: number };
  };
  byStrength: {
    elite: { total: number; correct: number; accuracy: number };
    strong: { total: number; correct: number; accuracy: number };
    moderate: { total: number; correct: number; accuracy: number };
  };
  avgProfitOnCorrect: number;
  avgLossOnIncorrect: number;
}

/**
 * Check for newly resolved markets and update signal outcomes
 */
export async function trackSignalAccuracy(): Promise<{
  checked: number;
  updated: number;
  errors: number;
}> {
  logger.info("🔍 Starting signal accuracy tracking...");

  const stats = { checked: 0, updated: 0, errors: 0 };

  try {
    // Find signals that haven't been resolved yet but their markets have
    const unresolvedSignals = await db.execute(sql`
      SELECT 
        s.id as signal_id,
        s.market_id,
        s.outcome as predicted_outcome,
        s.entry_price,
        s.signal_source,
        s.signal_strength,
        m.resolved,
        m.outcome as actual_outcome,
        m.metadata->>'currentPrice' as final_price
      FROM best_bet_signals s
      JOIN markets m ON s.market_id = m.id
      WHERE s.was_correct IS NULL
        AND s.status IN ('active', 'expired')
        AND m.resolved = true
        AND m.outcome IS NOT NULL
    `);

    logger.info(`Found ${unresolvedSignals.length} signals to check`);

    for (const row of unresolvedSignals as any[]) {
      stats.checked++;

      try {
        const predictedOutcome = row.predicted_outcome?.toLowerCase();
        const actualOutcome = row.actual_outcome?.toLowerCase();
        const entryPrice = parseFloat(row.entry_price || "0.5");
        const finalPrice = parseFloat(row.final_price || "0.5");

        // Determine if prediction was correct
        // YES wins if market resolves "yes", NO wins if market resolves "no"
        let wasCorrect: boolean;
        let actualProfit: number;

        if (actualOutcome === 'yes') {
          wasCorrect = predictedOutcome === 'yes';
          // If we predicted YES: profit = (1 - entry_price) per share
          // If we predicted NO: loss = entry_price (of NO) per share
          actualProfit = predictedOutcome === 'yes' 
            ? (1 - entryPrice) * 100 // Win $100 on $entry bet
            : -entryPrice * 100; // Lose $entry bet
        } else if (actualOutcome === 'no') {
          wasCorrect = predictedOutcome === 'no';
          actualProfit = predictedOutcome === 'no'
            ? (1 - (1 - entryPrice)) * 100 // Win on NO position
            : -(1 - entryPrice) * 100; // Lose on YES position
        } else {
          // Unknown outcome - skip
          continue;
        }

        // Update signal record
        await db.execute(sql`
          UPDATE best_bet_signals
          SET 
            was_correct = ${wasCorrect},
            actual_outcome = ${actualOutcome},
            actual_profit = ${actualProfit.toFixed(2)}::numeric,
            price_at_resolution = ${finalPrice.toFixed(4)}::numeric,
            resolved_at = NOW(),
            status = 'executed',
            updated_at = NOW()
          WHERE id = ${row.signal_id}::uuid
        `);

        stats.updated++;
        logger.info(`Signal ${row.signal_id.slice(0, 8)}: ${wasCorrect ? '✅ CORRECT' : '❌ WRONG'} (predicted ${predictedOutcome}, actual ${actualOutcome})`);
      } catch (error) {
        logger.error(`Failed to update signal ${row.signal_id}`, error);
        stats.errors++;
      }
    }

    logger.info(`✅ Accuracy tracking complete: ${stats.updated} signals updated`);
    return stats;
  } catch (error) {
    logger.error("Accuracy tracking failed", error);
    throw error;
  }
}

/**
 * Get comprehensive accuracy statistics
 */
export async function getAccuracyStats(): Promise<AccuracyStats> {
  try {
    // Overall stats
    const overallStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN was_correct IS NOT NULL THEN 1 END) as resolved,
        COUNT(CASE WHEN was_correct = true THEN 1 END) as correct,
        AVG(CASE WHEN was_correct = true THEN actual_profit END) as avg_profit,
        AVG(CASE WHEN was_correct = false THEN actual_profit END) as avg_loss
      FROM best_bet_signals
      WHERE status IN ('active', 'expired', 'executed')
    `);

    // Stats by signal source
    const sourceStats = await db.execute(sql`
      SELECT 
        COALESCE(signal_source, 'combined') as source,
        COUNT(*) as total,
        COUNT(CASE WHEN was_correct = true THEN 1 END) as correct
      FROM best_bet_signals
      WHERE was_correct IS NOT NULL
      GROUP BY signal_source
    `);

    // Stats by signal strength
    const strengthStats = await db.execute(sql`
      SELECT 
        signal_strength as strength,
        COUNT(*) as total,
        COUNT(CASE WHEN was_correct = true THEN 1 END) as correct
      FROM best_bet_signals
      WHERE was_correct IS NOT NULL
      GROUP BY signal_strength
    `);

    const overall = (overallStats[0] as any) || {};
    const totalSignals = parseInt(overall.total || "0");
    const resolvedSignals = parseInt(overall.resolved || "0");
    const correctPredictions = parseInt(overall.correct || "0");
    const accuracyRate = resolvedSignals > 0 ? (correctPredictions / resolvedSignals) * 100 : 0;

    // Build source breakdown
    const bySource: AccuracyStats['bySource'] = {
      whale: { total: 0, correct: 0, accuracy: 0 },
      momentum: { total: 0, correct: 0, accuracy: 0 },
      combined: { total: 0, correct: 0, accuracy: 0 },
    };

    for (const row of sourceStats as any[]) {
      const source = row.source as keyof typeof bySource;
      if (source in bySource) {
        bySource[source] = {
          total: parseInt(row.total || "0"),
          correct: parseInt(row.correct || "0"),
          accuracy: parseInt(row.total || "0") > 0 
            ? (parseInt(row.correct || "0") / parseInt(row.total || "0")) * 100 
            : 0,
        };
      }
    }

    // Build strength breakdown
    const byStrength: AccuracyStats['byStrength'] = {
      elite: { total: 0, correct: 0, accuracy: 0 },
      strong: { total: 0, correct: 0, accuracy: 0 },
      moderate: { total: 0, correct: 0, accuracy: 0 },
    };

    for (const row of strengthStats as any[]) {
      const strength = row.strength as keyof typeof byStrength;
      if (strength in byStrength) {
        byStrength[strength] = {
          total: parseInt(row.total || "0"),
          correct: parseInt(row.correct || "0"),
          accuracy: parseInt(row.total || "0") > 0 
            ? (parseInt(row.correct || "0") / parseInt(row.total || "0")) * 100 
            : 0,
        };
      }
    }

    return {
      totalSignals,
      resolvedSignals,
      correctPredictions,
      accuracyRate,
      bySource,
      byStrength,
      avgProfitOnCorrect: parseFloat(overall.avg_profit || "0"),
      avgLossOnIncorrect: parseFloat(overall.avg_loss || "0"),
    };
  } catch (error) {
    logger.error("Failed to get accuracy stats", error);
    throw error;
  }
}

/**
 * Schedule accuracy tracking (runs every hour)
 */
export function scheduleAccuracyTracking(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  logger.info(`Scheduling accuracy tracking every ${intervalMs / 1000 / 60} minutes`);

  // Run immediately
  trackSignalAccuracy().catch(err => logger.error("Initial accuracy tracking failed", err));

  // Then run on interval
  return setInterval(() => {
    trackSignalAccuracy().catch(err => logger.error("Scheduled accuracy tracking failed", err));
  }, intervalMs);
}
