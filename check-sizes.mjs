import postgres from 'postgres';

const sql = postgres('postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway', { 
  connect_timeout: 60, 
  max: 1 
});

try {
  await sql`SELECT 1`;
  console.log('✅ Database back online\n');
  
  console.log('Running VACUUM...');
  await sql`VACUUM`;
  console.log('✅ VACUUM complete\n');
  
  const sizes = await sql`
    SELECT tablename, pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
    FROM pg_tables WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size('public.' || tablename) DESC LIMIT 10
  `;
  console.log('📊 Table sizes after cleanup:');
  sizes.forEach(t => console.log(`  ${t.tablename}: ${t.size}`));
  
  const total = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) as total`;
  console.log(`\n📦 Total database size: ${total[0].total}`);
  
  await sql.end();
} catch (e) {
  console.log('Error:', e.message);
  await sql.end();
}
