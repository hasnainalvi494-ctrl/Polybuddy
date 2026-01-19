import postgres from 'postgres';

const sql = postgres('postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway');

async function check() {
  try {
    const signals = await sql`SELECT COUNT(*) as count FROM best_bet_signals`;
    console.log('Best Bet Signals count:', signals[0].count);
    
    const traders = await sql`SELECT COUNT(*) as count FROM wallet_performance`;
    console.log('Wallet Performance count:', traders[0].count);
    
    const markets = await sql`SELECT COUNT(*) as count FROM markets`;
    console.log('Markets count:', markets[0].count);
    
    await sql.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
}

check();
