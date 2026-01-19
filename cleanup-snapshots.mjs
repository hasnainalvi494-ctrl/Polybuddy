import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway';

async function cleanup() {
  console.log('🧹 Aggressive cleanup of market_snapshots...\n');
  
  const sql = postgres(DATABASE_URL, {
    connect_timeout: 60,
    max: 1,
  });

  try {
    await sql`SELECT 1`;
    console.log('✅ Connected\n');

    // Check how many snapshots exist
    const count = await sql`SELECT COUNT(*) as cnt FROM market_snapshots`;
    console.log(`📊 Current market_snapshots rows: ${count[0].cnt}`);

    // Keep only latest 500 snapshots per market (or just 5000 total)
    console.log('\n🗑️ Deleting old snapshots (keeping only latest 5000)...');
    
    const deleted = await sql`
      DELETE FROM market_snapshots 
      WHERE id NOT IN (
        SELECT id FROM market_snapshots 
        ORDER BY snapshot_at DESC 
        LIMIT 5000
      )
    `;
    console.log(`✅ Deleted ${deleted.count} old snapshots`);

    // Also truncate some unused tables
    console.log('\n🗑️ Truncating unused/empty tables...');
    
    const tablesToTruncate = [
      'market_participation_structure',
      'market_behavior_dimensions',
      'retail_flow_guard',
      'market_resolution_drivers',
      'hidden_exposure_links',
    ];

    for (const table of tablesToTruncate) {
      try {
        await sql.unsafe(`TRUNCATE TABLE ${table}`);
        console.log(`  ✅ Truncated ${table}`);
      } catch (e) {
        console.log(`  ⚠️ ${table}: ${e.message}`);
      }
    }

    // VACUUM FULL to really reclaim space
    console.log('\n🔄 Running VACUUM FULL (this takes a moment)...');
    await sql`VACUUM FULL market_snapshots`;
    console.log('✅ VACUUM FULL complete');

    // Final sizes
    console.log('\n📊 Final table sizes:');
    const sizes = await sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.' || tablename) DESC
      LIMIT 10
    `;
    sizes.forEach(t => console.log(`  ${t.tablename}: ${t.size}`));

    // Total DB size
    const total = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total
    `;
    console.log(`\n📦 Total database size: ${total[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

cleanup();
