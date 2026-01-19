import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Connection attempt ${i + 1}/${maxRetries}...`);
      const sql = postgres(DATABASE_URL, {
        connect_timeout: 60,
        idle_timeout: 30,
        max_lifetime: 60 * 30,
        max: 1,
      });
      
      // Test connection
      await sql`SELECT 1`;
      console.log('✅ Connected to database!');
      return sql;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      if (i < maxRetries - 1) {
        console.log('Waiting 10 seconds before retry...');
        await sleep(10000);
      }
    }
  }
  throw new Error('Failed to connect after all retries');
}

async function fixDatabase() {
  console.log('🔧 Fixing database schema...\n');

  const sql = await connectWithRetry();

  try {
    // 1. Create wallet_trades table if not exists
    console.log('\n1. Creating wallet_trades table...');
    await sql`
      CREATE TABLE IF NOT EXISTS wallet_trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address TEXT NOT NULL,
        market_id TEXT NOT NULL,
        side TEXT NOT NULL,
        outcome TEXT NOT NULL,
        entry_price DECIMAL(10, 4),
        exit_price DECIMAL(10, 4),
        size DECIMAL(18, 8),
        profit DECIMAL(18, 2),
        is_winner BOOLEAN,
        opened_at TIMESTAMP WITH TIME ZONE,
        closed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ wallet_trades table ready');

    // 2. Create indexes for wallet_trades
    console.log('\n2. Creating indexes...');
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_wallet_trades_wallet ON wallet_trades(wallet_address)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_wallet_trades_market ON wallet_trades(market_id)`;
      console.log('✅ Indexes created');
    } catch (e) {
      console.log('Indexes may already exist:', e.message);
    }

    // 3. Check whale_activity table
    console.log('\n3. Checking whale_activity table...');
    await sql`
      CREATE TABLE IF NOT EXISTS whale_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address TEXT NOT NULL,
        market_id TEXT NOT NULL,
        action TEXT NOT NULL,
        outcome TEXT,
        amount_usd DECIMAL(18, 2),
        price DECIMAL(10, 4),
        price_before DECIMAL(10, 4),
        price_after DECIMAL(10, 4),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ whale_activity table ready');

    // 4. Fix any signals with wrong status
    console.log('\n4. Updating signal statuses...');
    const updated = await sql`
      UPDATE best_bet_signals 
      SET status = 'active', 
          expires_at = NOW() + INTERVAL '7 days'
      WHERE status IS NULL OR expires_at < NOW()
      RETURNING id
    `;
    console.log('✅ Updated', updated.length, 'signals');

    // 5. Verify counts
    console.log('\n📊 Database Status:');
    
    const markets = await sql`SELECT COUNT(*) as count FROM markets`;
    console.log('  Markets:', markets[0].count);
    
    const traders = await sql`SELECT COUNT(*) as count FROM wallet_performance`;
    console.log('  Traders:', traders[0].count);
    
    const signals = await sql`SELECT COUNT(*) as count FROM best_bet_signals`;
    console.log('  Total Signals:', signals[0].count);
    
    const activeSignals = await sql`
      SELECT COUNT(*) as count FROM best_bet_signals 
      WHERE status = 'active' AND expires_at > NOW()
    `;
    console.log('  Active Signals:', activeSignals[0].count);

    const walletTrades = await sql`SELECT COUNT(*) as count FROM wallet_trades`;
    console.log('  Wallet Trades:', walletTrades[0].count);

    console.log('\n✅ Database fix complete!');
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

fixDatabase();
