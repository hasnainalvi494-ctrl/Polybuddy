import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway';

async function cleanup() {
  console.log('🧹 Connecting to Railway database...');
  
  const sql = postgres(DATABASE_URL, {
    connect_timeout: 60,
    idle_timeout: 30,
    max: 1,
  });

  try {
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connected!\n');

    // 1. Check table sizes first
    console.log('📊 Current table sizes:');
    const sizes = await sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size,
        pg_total_relation_size('public.' || tablename) as bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.' || tablename) DESC
      LIMIT 15
    `;
    sizes.forEach(t => console.log(`  ${t.tablename}: ${t.size}`));

    console.log('\n🗑️ Starting cleanup...\n');

    // 2. Clean best_bet_signals - keep only latest 100
    try {
      const deleted1 = await sql`
        DELETE FROM best_bet_signals 
        WHERE id NOT IN (
          SELECT id FROM best_bet_signals 
          ORDER BY created_at DESC 
          LIMIT 100
        )
      `;
      console.log(`✅ Cleaned best_bet_signals: ${deleted1.count} rows deleted`);
    } catch (e) {
      console.log(`⚠️ best_bet_signals: ${e.message}`);
    }

    // 3. Clean market_snapshots - keep only last 2 days
    try {
      const deleted2 = await sql`
        DELETE FROM market_snapshots 
        WHERE snapshot_at < NOW() - INTERVAL '2 days'
      `;
      console.log(`✅ Cleaned market_snapshots: ${deleted2.count} rows deleted`);
    } catch (e) {
      console.log(`⚠️ market_snapshots: ${e.message}`);
    }

    // 4. Clean notifications - keep only last 7 days
    try {
      const deleted3 = await sql`
        DELETE FROM notifications 
        WHERE created_at < NOW() - INTERVAL '7 days'
      `;
      console.log(`✅ Cleaned notifications: ${deleted3.count} rows deleted`);
    } catch (e) {
      console.log(`⚠️ notifications: ${e.message}`);
    }

    // 5. Clean alert_history
    try {
      const deleted4 = await sql`
        DELETE FROM alert_history 
        WHERE created_at < NOW() - INTERVAL '7 days'
      `;
      console.log(`✅ Cleaned alert_history: ${deleted4.count} rows deleted`);
    } catch (e) {
      console.log(`⚠️ alert_history: ${e.message}`);
    }

    // 6. Clean whale_activity - keep only last 500
    try {
      const deleted5 = await sql`
        DELETE FROM whale_activity 
        WHERE id NOT IN (
          SELECT id FROM whale_activity 
          ORDER BY timestamp DESC NULLS LAST
          LIMIT 500
        )
      `;
      console.log(`✅ Cleaned whale_activity: ${deleted5.count} rows deleted`);
    } catch (e) {
      console.log(`⚠️ whale_activity: ${e.message}`);
    }

    // 7. Clean wallet_trades - keep only last 1000
    try {
      const deleted6 = await sql`
        DELETE FROM wallet_trades 
        WHERE id NOT IN (
          SELECT id FROM wallet_trades 
          ORDER BY created_at DESC NULLS LAST
          LIMIT 1000
        )
      `;
      console.log(`✅ Cleaned wallet_trades: ${deleted6.count} rows deleted`);
    } catch (e) {
      console.log(`⚠️ wallet_trades: ${e.message}`);
    }

    // 8. Run VACUUM to reclaim space
    console.log('\n🔄 Running VACUUM to reclaim space...');
    await sql`VACUUM`;
    console.log('✅ VACUUM complete');

    // 9. Show new sizes
    console.log('\n📊 New table sizes:');
    const newSizes = await sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.' || tablename) DESC
      LIMIT 15
    `;
    newSizes.forEach(t => console.log(`  ${t.tablename}: ${t.size}`));

    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

cleanup();
