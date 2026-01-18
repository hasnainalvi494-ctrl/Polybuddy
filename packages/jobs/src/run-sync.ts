/**
 * CLI Script to run trader data sync
 */

import { config } from 'dotenv';
import { runFullSync } from './sync-trader-data';

// Load environment variables
config({ path: '../../.env' });

console.log('Starting Polybuddy Trader Sync Job...\n');

runFullSync()
  .then((results) => {
    const successful = results.filter(r => r.success).length;
    console.log(`\n✅ Job completed: ${successful}/${results.length} traders synced`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Job failed:', error);
    process.exit(1);
  });
