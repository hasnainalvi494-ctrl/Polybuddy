/**
 * Database Cleanup Job - Prevents disk space issues
 * Runs daily to remove old snapshot data
 */

import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

/**
 * Clean up old market snapshots to prevent disk space issues
 * Keeps only the last 7 days of snapshots
 */
export async function cleanupOldSnapshots() {
  console.log("[CLEANUP] Starting snapshot cleanup...");
  console.log("[CLEANUP] This will free up database space by removing old snapshots");
  
  try {
    // Count snapshots before cleanup
    const beforeCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM market_snapshots
    `);
    
    console.log(`[CLEANUP] Current snapshots: ${beforeCount[0]?.count || 0}`);
    
    // Delete snapshots older than 7 days
    const deleteResult = await db.execute(sql`
      DELETE FROM market_snapshots 
      WHERE snapshot_at < NOW() - INTERVAL '7 days'
    `);
    
    console.log(`[CLEANUP] Deleted old snapshots`);
    
    // Keep only 1 snapshot per market per hour (for data older than 24 hours)
    // This preserves trends while reducing storage
    await db.execute(sql`
      DELETE FROM market_snapshots ms1
      WHERE snapshot_at < NOW() - INTERVAL '1 day'
      AND EXISTS (
        SELECT 1 FROM market_snapshots ms2
        WHERE ms2.market_id = ms1.market_id
        AND DATE_TRUNC('hour', ms2.snapshot_at) = DATE_TRUNC('hour', ms1.snapshot_at)
        AND ms2.snapshot_at > ms1.snapshot_at
      )
    `);
    
    console.log(`[CLEANUP] Deduplicated hourly snapshots`);
    
    // Count snapshots after cleanup
    const afterCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM market_snapshots
    `);
    
    const removed = (beforeCount[0]?.count || 0) - (afterCount[0]?.count || 0);
    console.log(`[CLEANUP] ✅ Cleanup complete! Removed ${removed} snapshots, ${afterCount[0]?.count || 0} remaining`);
    
    // Get table size
    const sizeResult = await db.execute(sql`
      SELECT pg_size_pretty(pg_total_relation_size('market_snapshots')) AS size
    `);
    
    console.log(`[CLEANUP] Market snapshots table size: ${sizeResult[0]?.size || 'unknown'}`);
    
  } catch (error) {
    console.error("[CLEANUP] Failed to cleanup snapshots:", error);
    throw error;
  }
}

/**
 * Schedule the cleanup job to run daily
 */
export function scheduleSnapshotCleanup(intervalMs: number = 24 * 60 * 60 * 1000) {
  console.log(`[CLEANUP] Scheduling snapshot cleanup (every ${intervalMs / 1000 / 60 / 60} hours)`);
  
  // Run immediately on startup
  cleanupOldSnapshots().catch((err) => {
    console.error("[CLEANUP] Initial cleanup failed:", err);
  });
  
  // Schedule recurring cleanup
  const interval = setInterval(() => {
    cleanupOldSnapshots().catch((err) => {
      console.error("[CLEANUP] Scheduled cleanup failed:", err);
    });
  }, intervalMs);
  
  return interval;
}
