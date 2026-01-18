/**
 * Background Job: Sync Elite Trader Data
 * 
 * Fetches real data from Polymarket and updates trader scores
 */

import { polymarketClient } from '@polybuddy/polymarket-client';
import { fetchAndCalculateWalletMetrics } from '@polybuddy/analytics/src/real-metrics-calculator';
import { calculateTraderScore } from '@polybuddy/analytics/src/trader-scoring';
import { db } from '@polybuddy/db';
import { walletPerformance } from '@polybuddy/db/src/schema';
import { eq } from 'drizzle-orm';

export interface SyncJobConfig {
  maxWallets: number;
  onProgress?: (current: number, total: number, wallet: string) => void;
  onComplete?: (results: SyncResult[]) => void;
  onError?: (error: Error) => void;
}

export interface SyncResult {
  walletAddress: string;
  success: boolean;
  trades: number;
  eliteScore?: number;
  error?: string;
}

/**
 * Sync trader data for specific wallets
 */
export async function syncTraderData(
  walletAddresses: string[],
  config: Partial<SyncJobConfig> = {}
): Promise<SyncResult[]> {
  const { maxWallets = 50, onProgress, onComplete, onError } = config;
  
  console.log(`\n🔄 Starting trader data sync for ${Math.min(walletAddresses.length, maxWallets)} wallets...`);
  
  const results: SyncResult[] = [];
  const walletsToSync = walletAddresses.slice(0, maxWallets);
  
  for (let i = 0; i < walletsToSync.length; i++) {
    const wallet = walletsToSync[i];
    
    try {
      if (onProgress) {
        onProgress(i + 1, walletsToSync.length, wallet);
      }
      
      console.log(`\n[${i + 1}/${walletsToSync.length}] Processing ${wallet}...`);
      
      // Fetch real trade data from Polymarket
      const metrics = await fetchAndCalculateWalletMetrics(polymarketClient, wallet);
      
      if (metrics.tradeCount === 0) {
        console.log(`  ⚠️  No trades found`);
        results.push({
          walletAddress: wallet,
          success: false,
          trades: 0,
          error: 'No trades found',
        });
        continue;
      }
      
      // Calculate trader score
      const score = calculateTraderScore(wallet, metrics);
      
      console.log(`  ✅ ${metrics.tradeCount} trades, Score: ${score.eliteScore.toFixed(1)}, Tier: ${score.traderTier}`);
      
      // Save to database
      await db
        .insert(walletPerformance)
        .values({
          walletAddress: wallet,
          totalProfit: metrics.totalProfit.toString(),
          totalVolume: metrics.totalVolume.toString(),
          winRate: metrics.winRate.toString(),
          tradeCount: metrics.tradeCount,
          roiPercent: metrics.roiPercent.toString(),
          profitFactor: metrics.profitFactor.toString(),
          sharpeRatio: metrics.sharpeRatio.toString(),
          maxDrawdown: metrics.maxDrawdown.toString(),
          consecutiveWins: metrics.consecutiveWins,
          longestWinStreak: metrics.longestWinStreak,
          marketTimingScore: metrics.marketTimingScore.toString(),
          eliteScore: score.eliteScore.toString(),
          traderTier: score.traderTier,
          riskProfile: score.riskProfile,
          grossProfit: metrics.grossProfit.toString(),
          totalLoss: metrics.grossLoss.toString(),
          totalTrades: metrics.tradeCount,
          winningTrades: Math.round(metrics.tradeCount * (metrics.winRate / 100)),
          losingTrades: metrics.tradeCount - Math.round(metrics.tradeCount * (metrics.winRate / 100)),
          lastTradeAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: walletPerformance.walletAddress,
          set: {
            totalProfit: metrics.totalProfit.toString(),
            totalVolume: metrics.totalVolume.toString(),
            winRate: metrics.winRate.toString(),
            tradeCount: metrics.tradeCount,
            eliteScore: score.eliteScore.toString(),
            traderTier: score.traderTier,
            updatedAt: new Date(),
          },
        });
      
      results.push({
        walletAddress: wallet,
        success: true,
        trades: metrics.tradeCount,
        eliteScore: score.eliteScore,
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`  ❌ Error processing ${wallet}:`, error);
      results.push({
        walletAddress: wallet,
        success: false,
        trades: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }
  
  console.log(`\n✅ Sync complete! ${results.filter(r => r.success).length}/${results.length} successful`);
  
  if (onComplete) {
    onComplete(results);
  }
  
  return results;
}

/**
 * Discover and sync top traders from recent activity
 */
export async function discoverAndSyncTopTraders(limit = 50): Promise<SyncResult[]> {
  console.log(`\n🔍 Discovering top ${limit} traders from recent activity...`);
  
  try {
    // Get top traders by recent volume
    const topTraders = await polymarketClient.getTopTraders(limit);
    
    if (topTraders.length === 0) {
      console.log('⚠️  No traders found');
      return [];
    }
    
    console.log(`✅ Found ${topTraders.length} active traders`);
    
    // Sync their data
    return await syncTraderData(topTraders, { maxWallets: limit });
    
  } catch (error) {
    console.error('❌ Error discovering traders:', error);
    return [];
  }
}

/**
 * Run full sync job
 */
export async function runFullSync() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 POLYBUDDY TRADER SYNC JOB');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  // Discover and sync top traders
  const results = await discoverAndSyncTopTraders(30);
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter(r => r.success).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYNC SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Wallets: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${results.length - successful}`);
  console.log(`Time: ${elapsed}s`);
  console.log('='.repeat(60) + '\n');
  
  return results;
}
