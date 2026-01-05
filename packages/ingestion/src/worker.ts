import { CronJob } from "cron";
import { marketIngestionService } from "./market-ingestion.js";

const SYNC_INTERVAL = process.env.SYNC_INTERVAL || "*/15 * * * *"; // Every 15 minutes

async function runSync(): Promise<void> {
  try {
    console.log(`[Worker] Starting scheduled sync at ${new Date().toISOString()}`);
    const stats = await marketIngestionService.syncMarkets();
    console.log("[Worker] Sync completed:", stats);
  } catch (error) {
    console.error("[Worker] Sync failed:", error);
  }
}

async function main(): Promise<void> {
  console.log("[Worker] Polymarket ingestion worker starting...");
  console.log(`[Worker] Sync schedule: ${SYNC_INTERVAL}`);

  // Run initial sync on startup
  await runSync();

  // Schedule recurring syncs
  const job = new CronJob(SYNC_INTERVAL, runSync);
  job.start();

  console.log("[Worker] Worker started, waiting for next sync...");

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[Worker] Received SIGTERM, shutting down...");
    job.stop();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("[Worker] Received SIGINT, shutting down...");
    job.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
