import postgres from 'postgres';

const sql = postgres('postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway');

async function check() {
  try {
    // Check signal statuses
    console.log('=== Signal Status Distribution ===');
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count 
      FROM best_bet_signals 
      GROUP BY status
    `;
    console.log(statusCounts);
    
    // Check expired vs active
    console.log('\n=== Expired vs Active ===');
    const expiryCounts = await sql`
      SELECT 
        CASE WHEN expires_at > NOW() THEN 'active' ELSE 'expired' END as expiry_status,
        COUNT(*) as count
      FROM best_bet_signals
      GROUP BY CASE WHEN expires_at > NOW() THEN 'active' ELSE 'expired' END
    `;
    console.log(expiryCounts);
    
    // Check if market_id matches markets table
    console.log('\n=== Signals with valid market join ===');
    const validJoins = await sql`
      SELECT COUNT(*) as count
      FROM best_bet_signals bbs
      JOIN markets m ON m.id = bbs.market_id
      WHERE bbs.status = 'active' AND bbs.expires_at > NOW()
    `;
    console.log('Valid signals with market:', validJoins[0].count);
    
    // Sample a signal
    console.log('\n=== Sample Signal ===');
    const sample = await sql`
      SELECT id, market_id, status, expires_at, signal_strength
      FROM best_bet_signals
      LIMIT 1
    `;
    console.log(sample[0]);
    
    await sql.end();
  } catch(e) {
    console.error('Error:', e.message);
    await sql.end();
  }
}

check();
