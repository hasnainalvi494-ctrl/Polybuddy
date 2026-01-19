#!/usr/bin/env node
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL, { max: 1 });

console.log("🔍 Testing best_bet_signals query...\n");

try {
  // Test the exact query from the API
  const results = await sql`
    SELECT 
      bbs.id,
      bbs.market_id,
      m.question as market_question,
      m.category as market_category,
      bbs.confidence,
      bbs.signal_strength,
      bbs.entry_price,
      bbs.target_price,
      bbs.stop_loss,
      bbs.outcome,
      bbs.trader_address,
      bbs.trader_win_rate,
      bbs.trader_elite_score,
      bbs.trader_profit_history,
      bbs.reasoning,
      bbs.time_horizon,
      bbs.generated_at,
      bbs.expires_at,
      bbs.position_size,
      bbs.kelly_criterion,
      bbs.risk_reward_ratio,
      COALESCE(
        (m.metadata->>'currentPrice')::numeric,
        0.50
      ) as current_price
    FROM best_bet_signals bbs
    JOIN markets m ON m.id = bbs.market_id
    WHERE bbs.status = 'active'
      AND bbs.expires_at > NOW()
      AND bbs.confidence >= 75
    ORDER BY 
      CASE bbs.signal_strength
        WHEN 'elite' THEN 4
        WHEN 'strong' THEN 3
        WHEN 'moderate' THEN 2
        ELSE 1
      END DESC,
      bbs.confidence DESC
    LIMIT 10
  `;
  
  console.log(`✅ Query succeeded! Found ${results.length} results\n`);
  
  if (results.length > 0) {
    console.log("Sample signal:");
    console.log(JSON.stringify(results[0], null, 2));
  }
  
} catch (error) {
  console.error("❌ Query failed:");
  console.error(error.message);
  console.error("\nFull error:", error);
} finally {
  await sql.end();
}
