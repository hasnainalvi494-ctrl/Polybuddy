#!/usr/bin/env node
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL, { max: 1 });

console.log("📊 Checking database data...\n");

try {
  const markets = await sql`SELECT COUNT(*) as count FROM markets`;
  console.log(`Markets: ${markets[0].count}`);
  
  const bestBets = await sql`SELECT COUNT(*) as count FROM best_bet_signals`;
  console.log(`Best Bets: ${bestBets[0].count}`);
  
  const whales = await sql`SELECT COUNT(*) as count FROM whale_activity`;
  console.log(`Whale Activity: ${whales[0].count}`);
  
  const wallets = await sql`SELECT COUNT(*) as count FROM wallet_performance`;
  console.log(`Wallet Performance: ${wallets[0].count}`);
  
  const eliteTraders = await sql`SELECT COUNT(*) as count FROM elite_traders`;
  console.log(`Elite Traders: ${eliteTraders[0].count}`);
  
  console.log("\n📋 Sample best bet signals:");
  const samples = await sql`SELECT * FROM best_bet_signals LIMIT 3`;
  console.log(JSON.stringify(samples, null, 2));
  
} catch (error) {
  console.error("Error:", error.message);
} finally {
  await sql.end();
}
