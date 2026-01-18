/**
 * Automated Market Sync Service
 * 
 * Runs in the background to keep market data fresh
 */

import { syncRealMarkets } from '@polybuddy/polymarket-client/sync-markets';

export class MarketSyncService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  /**
   * Start automated sync
   */
  async start(intervalMinutes = 60) {
    if (this.isRunning) {
      console.log('⚠️  Market sync already running');
      return;
    }
    
    console.log(`🚀 Starting automated market sync (every ${intervalMinutes} minutes)`);
    
    // Run immediately on start
    await this.sync();
    
    // Then run on interval
    this.intervalId = setInterval(async () => {
      await this.sync();
    }, intervalMinutes * 60 * 1000);
    
    this.isRunning = true;
  }
  
  /**
   * Stop automated sync
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('⏸️  Market sync stopped');
    }
  }
  
  /**
   * Run sync once
   */
  private async sync() {
    const timestamp = new Date().toLocaleString();
    console.log(`\n[${timestamp}] 🔄 Running market sync...`);
    
    try {
      const result = await syncRealMarkets(50); // Sync top 50 markets
      
      if (result.success) {
        console.log(`[${timestamp}] ✅ Sync complete: ${result.marketsUpdated} markets updated`);
      } else {
        console.log(`[${timestamp}] ❌ Sync failed`);
      }
    } catch (error) {
      console.error(`[${timestamp}] ❌ Sync error:`, error);
    }
  }
}

export const marketSyncService = new MarketSyncService();
