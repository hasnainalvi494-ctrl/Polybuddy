import { db, umaDisputes, umaDisputeHistory, markets } from "@polybuddy/db";
import { eq, desc } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

interface UMASubgraphDispute {
  id: string;
  marketId: string;
  status: "commit_stage" | "reveal_stage" | "resolved";
  proposedOutcome: string | null;
  disputedOutcome: string | null;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  votingEndsAt: string | null;
}

// ============================================================================
// UMA ORACLE SUBGRAPH INTEGRATION
// ============================================================================

const UMA_SUBGRAPH_URL = process.env.UMA_SUBGRAPH_URL || 
  "https://api.thegraph.com/subgraphs/name/umaprotocol/polygon-mainnet";

/**
 * Fetch disputed markets from UMA Oracle subgraph
 * In production, this would query the actual UMA subgraph
 * For now, returns mock data for demonstration
 */
async function fetchDisputesFromSubgraph(): Promise<UMASubgraphDispute[]> {
  try {
    // TODO: Replace with actual subgraph query
    // Example query:
    // const query = `
    //   query GetDisputes {
    //     disputes(where: { status_in: ["commit_stage", "reveal_stage"] }) {
    //       id
    //       marketId
    //       status
    //       proposedOutcome
    //       disputedOutcome
    //       totalVotes
    //       yesVotes
    //       noVotes
    //       votingEndsAt
    //     }
    //   }
    // `;
    // 
    // const response = await fetch(UMA_SUBGRAPH_URL, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ query }),
    // });
    // 
    // const data = await response.json();
    // return data.data.disputes;

    // Mock data for demonstration
    console.log("[UMA] Fetching disputes from UMA subgraph (mock data)");
    return [];
  } catch (error) {
    console.error("[UMA] Error fetching disputes from UMA subgraph:", error);
    return [];
  }
}

/**
 * Sync disputes from UMA subgraph to database
 * Should be called every 5 minutes
 */
export async function syncUMADisputes(): Promise<void> {
  try {
    console.log("[UMA] Starting UMA disputes sync...");
    
    const subgraphDisputes = await fetchDisputesFromSubgraph();
    
    if (subgraphDisputes.length === 0) {
      console.log("[UMA] No active disputes found");
      return;
    }

    for (const dispute of subgraphDisputes) {
      // Check if market exists in our database
      const marketExists = await db.query.markets.findFirst({
        where: eq(markets.polymarketId, dispute.marketId),
      });

      if (!marketExists) {
        console.warn(`[UMA] Market ${dispute.marketId} not found in database, skipping dispute`);
        continue;
      }

      // Upsert dispute
      const existing = await db.query.umaDisputes.findFirst({
        where: eq(umaDisputes.marketId, marketExists.id),
      });

      if (existing) {
        // Update existing dispute
        await db
          .update(umaDisputes)
          .set({
            disputeStatus: dispute.status,
            proposedOutcome: dispute.proposedOutcome,
            disputedOutcome: dispute.disputedOutcome,
            totalVotes: dispute.totalVotes,
            yesVotes: dispute.yesVotes,
            noVotes: dispute.noVotes,
            votingEndsAt: dispute.votingEndsAt ? new Date(dispute.votingEndsAt) : null,
            updatedAt: new Date(),
          })
          .where(eq(umaDisputes.id, existing.id));

        console.log(`[UMA] Updated dispute for market ${marketExists.id}`);
      } else {
        // Insert new dispute
        await db.insert(umaDisputes).values({
          marketId: marketExists.id,
          disputeStatus: dispute.status,
          proposedOutcome: dispute.proposedOutcome,
          disputedOutcome: dispute.disputedOutcome,
          totalVotes: dispute.totalVotes,
          yesVotes: dispute.yesVotes,
          noVotes: dispute.noVotes,
          votingEndsAt: dispute.votingEndsAt ? new Date(dispute.votingEndsAt) : null,
        });

        console.log(`[UMA] Created new dispute for market ${marketExists.id}`);
      }
    }

    console.log(`[UMA] UMA disputes sync completed. Processed ${subgraphDisputes.length} disputes`);
  } catch (error) {
    console.error("[UMA] Error syncing UMA disputes:", error);
    throw error;
  }
}

/**
 * Get all active disputes
 */
export async function getActiveDisputes() {
  return await db.query.umaDisputes.findMany({
    with: {
      market: true,
    },
    orderBy: [desc(umaDisputes.createdAt)],
  });
}

/**
 * Get dispute for a specific market
 */
export async function getDisputeForMarket(marketId: string) {
  return await db.query.umaDisputes.findFirst({
    where: eq(umaDisputes.marketId, marketId),
    with: {
      market: true,
    },
  });
}

/**
 * Get historical disputes
 */
export async function getDisputeHistory(limit: number = 50) {
  return await db.query.umaDisputeHistory.findMany({
    orderBy: [desc(umaDisputeHistory.resolvedAt)],
    limit,
  });
}

/**
 * Record a resolved dispute in history
 */
export async function recordResolvedDispute(
  marketId: string,
  originalOutcome: string | null,
  finalOutcome: string | null,
  resolutionFlipped: boolean
): Promise<void> {
  try {
    await db.insert(umaDisputeHistory).values({
      marketId,
      originalOutcome,
      finalOutcome,
      resolutionFlipped,
      resolvedAt: new Date(),
    });

    // Remove from active disputes
    await db.delete(umaDisputes).where(eq(umaDisputes.marketId, marketId));

    console.log(`[UMA] Recorded resolved dispute for market ${marketId}`);
  } catch (error) {
    console.error("[UMA] Error recording resolved dispute:", error);
    throw error;
  }
}

/**
 * Schedule periodic sync of UMA disputes
 * Runs every 5 minutes
 */
export function scheduleUMADisputeSync(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  console.log(`[UMA] Scheduling UMA dispute sync every ${intervalMs / 1000} seconds`);
  
  // Run immediately on startup
  syncUMADisputes().catch((error) => {
    console.error("[UMA] Initial UMA dispute sync failed:", error);
  });

  // Then run periodically
  return setInterval(() => {
    syncUMADisputes().catch((error) => {
      console.error("[UMA] Scheduled UMA dispute sync failed:", error);
    });
  }, intervalMs);
}

