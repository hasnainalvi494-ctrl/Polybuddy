import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL || "postgresql://polybuddy:polybuddy@localhost:5432/polybuddy");

async function populateEliteTraders() {
  console.log("🚀 Populating database with Elite Traders demo data...\n");

  try {
    // First, let's check if the tables exist
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('wallet_performance', 'markets', 'whale_activity')
    `;
    
    console.log("✅ Found tables:", tablesCheck.map(t => t.table_name).join(", "));

    // Clear existing demo data
    console.log("\n🗑️  Clearing existing demo data...");
    await sql`DELETE FROM wallet_performance WHERE wallet_address LIKE '0x%demo%'`;
    
    // Create demo elite traders with calculated scores
    const demoTraders = [
      {
        wallet_address: "0xdemo1234567890abcdef1234567890abcdef1",
        total_profit: 25000,
        total_volume: 150000,
        win_rate: 89.5,
        trade_count: 150,
        roi_percent: 16.67,
        primary_category: "Crypto",
        last_trade_at: new Date(),
        rank: 1,
        profit_factor: 5.2,
        sharpe_ratio: 3.1,
        max_drawdown: 8.5,
        consecutive_wins: 18,
        avg_holding_time: 120,
        market_timing_score: 95,
        risk_adjusted_returns: 4.2,
        risk_profile: "conservative",
        elite_score: 92.5,
        trader_tier: "elite",
        category_distribution: { Crypto: 80, Business: 20 },
        total_loss: 5000,
        gross_profit: 30000,
        total_trades: 150,
        winning_trades: 134,
        losing_trades: 16,
        average_profit_per_trade: 223.88,
        average_loss_per_trade: 312.50,
        max_profit: 2500,
        max_loss: -800,
        std_dev_returns: 0.12,
        elite_rank: 1,
      },
      {
        wallet_address: "0xdemo2abcdef1234567890abcdef1234567890",
        total_profit: 22000,
        total_volume: 120000,
        win_rate: 86.7,
        trade_count: 135,
        roi_percent: 18.33,
        primary_category: "Sports",
        last_trade_at: new Date(),
        rank: 2,
        profit_factor: 4.8,
        sharpe_ratio: 2.9,
        max_drawdown: 10.2,
        consecutive_wins: 15,
        avg_holding_time: 180,
        market_timing_score: 92,
        risk_adjusted_returns: 3.8,
        risk_profile: "moderate",
        elite_score: 88.7,
        trader_tier: "elite",
        category_distribution: { Sports: 70, Entertainment: 30 },
        total_loss: 4500,
        gross_profit: 26500,
        total_trades: 135,
        winning_trades: 117,
        losing_trades: 18,
        average_profit_per_trade: 226.50,
        average_loss_per_trade: 250,
        max_profit: 2200,
        max_loss: -650,
        std_dev_returns: 0.15,
        elite_rank: 2,
      },
      {
        wallet_address: "0xdemo37890abcdef1234567890abcdef123456",
        total_profit: 18500,
        total_volume: 95000,
        win_rate: 84.2,
        trade_count: 120,
        roi_percent: 19.47,
        primary_category: "Politics",
        last_trade_at: new Date(),
        rank: 3,
        profit_factor: 4.3,
        sharpe_ratio: 2.6,
        max_drawdown: 12.0,
        consecutive_wins: 12,
        avg_holding_time: 240,
        market_timing_score: 88,
        risk_adjusted_returns: 3.4,
        risk_profile: "conservative",
        elite_score: 85.2,
        trader_tier: "elite",
        category_distribution: { Politics: 85, Business: 15 },
        total_loss: 4200,
        gross_profit: 22700,
        total_trades: 120,
        winning_trades: 101,
        losing_trades: 19,
        average_profit_per_trade: 224.75,
        average_loss_per_trade: 221.05,
        max_profit: 1900,
        max_loss: -550,
        std_dev_returns: 0.17,
        elite_rank: 3,
      },
      {
        wallet_address: "0xdemo42468ace02468ace02468ace02468ace0",
        total_profit: 15000,
        total_volume: 80000,
        win_rate: 81.5,
        trade_count: 100,
        roi_percent: 18.75,
        primary_category: "Business",
        last_trade_at: new Date(),
        rank: 4,
        profit_factor: 3.8,
        sharpe_ratio: 2.3,
        max_drawdown: 14.5,
        consecutive_wins: 10,
        avg_holding_time: 300,
        market_timing_score: 82,
        risk_adjusted_returns: 2.9,
        risk_profile: "moderate",
        elite_score: 81.5,
        trader_tier: "elite",
        category_distribution: { Business: 65, Crypto: 35 },
        total_loss: 4000,
        gross_profit: 19000,
        total_trades: 100,
        winning_trades: 82,
        losing_trades: 18,
        average_profit_per_trade: 231.71,
        average_loss_per_trade: 222.22,
        max_profit: 1700,
        max_loss: -600,
        std_dev_returns: 0.19,
        elite_rank: 4,
      },
      {
        wallet_address: "0xdemo513579bdf13579bdf13579bdf13579bdf",
        total_profit: 12000,
        total_volume: 70000,
        win_rate: 75.5,
        trade_count: 90,
        roi_percent: 17.14,
        primary_category: "Entertainment",
        last_trade_at: new Date(),
        rank: 5,
        profit_factor: 2.8,
        sharpe_ratio: 1.9,
        max_drawdown: 18.0,
        consecutive_wins: 8,
        avg_holding_time: 360,
        market_timing_score: 75,
        risk_adjusted_returns: 2.2,
        risk_profile: "moderate",
        elite_score: 76.5,
        trader_tier: "strong",
        category_distribution: { Entertainment: 55, Sports: 45 },
        total_loss: 4500,
        gross_profit: 16500,
        total_trades: 90,
        winning_trades: 68,
        losing_trades: 22,
        average_profit_per_trade: 242.65,
        average_loss_per_trade: 204.55,
        max_profit: 1500,
        max_loss: -550,
        std_dev_returns: 0.22,
        elite_rank: 5,
      },
      {
        wallet_address: "0xdemo6fedcba0987654321fedcba098765432",
        total_profit: 10000,
        total_volume: 60000,
        win_rate: 72.3,
        trade_count: 80,
        roi_percent: 16.67,
        primary_category: "Crypto",
        last_trade_at: new Date(),
        rank: 6,
        profit_factor: 2.5,
        sharpe_ratio: 1.7,
        max_drawdown: 20.0,
        consecutive_wins: 7,
        avg_holding_time: 420,
        market_timing_score: 70,
        risk_adjusted_returns: 1.9,
        risk_profile: "moderate",
        elite_score: 72.8,
        trader_tier: "strong",
        category_distribution: { Crypto: 60, Politics: 40 },
        total_loss: 4200,
        gross_profit: 14200,
        total_trades: 80,
        winning_trades: 58,
        losing_trades: 22,
        average_profit_per_trade: 244.83,
        average_loss_per_trade: 190.91,
        max_profit: 1300,
        max_loss: -500,
        std_dev_returns: 0.25,
        elite_rank: null,
      },
      {
        wallet_address: "0xdemo7111222333444555666777888999aaa",
        total_profit: 8000,
        total_volume: 50000,
        win_rate: 68.5,
        trade_count: 70,
        roi_percent: 16.0,
        primary_category: "Sports",
        last_trade_at: new Date(),
        rank: 7,
        profit_factor: 2.2,
        sharpe_ratio: 1.5,
        max_drawdown: 22.5,
        consecutive_wins: 6,
        avg_holding_time: 480,
        market_timing_score: 65,
        risk_adjusted_returns: 1.6,
        risk_profile: "aggressive",
        elite_score: 68.5,
        trader_tier: "strong",
        category_distribution: { Sports: 75, Entertainment: 25 },
        total_loss: 3800,
        gross_profit: 11800,
        total_trades: 70,
        winning_trades: 48,
        losing_trades: 22,
        average_profit_per_trade: 245.83,
        average_loss_per_trade: 172.73,
        max_profit: 1100,
        max_loss: -450,
        std_dev_returns: 0.28,
        elite_rank: null,
      },
    ];

    console.log("\n📝 Inserting demo traders...");
    
    for (const trader of demoTraders) {
      await sql`
        INSERT INTO wallet_performance ${sql(trader)}
        ON CONFLICT (wallet_address) 
        DO UPDATE SET ${sql(trader)}
      `;
      console.log(`   ✅ ${trader.wallet_address.slice(0, 20)}... (${trader.trader_tier}, score: ${trader.elite_score})`);
    }

    console.log("\n📊 Summary:");
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE trader_tier = 'elite') as elite_count,
        COUNT(*) FILTER (WHERE trader_tier = 'strong') as strong_count,
        COUNT(*) as total,
        AVG(elite_score) as avg_score,
        MAX(elite_score) as max_score,
        MIN(elite_score) as min_score
      FROM wallet_performance
      WHERE wallet_address LIKE '0xdemo%'
    `;

    const stat = stats[0];
    console.log(`   Total Traders: ${stat.total}`);
    console.log(`   Elite Tier: ${stat.elite_count}`);
    console.log(`   Strong Tier: ${stat.strong_count}`);
    console.log(`   Average Score: ${parseFloat(stat.avg_score).toFixed(2)}`);
    console.log(`   Score Range: ${parseFloat(stat.min_score).toFixed(1)} - ${parseFloat(stat.max_score).toFixed(1)}`);

    console.log("\n✨ Demo data population complete!");
    console.log("\n🌐 View in your browser:");
    console.log("   Elite Traders: http://localhost:3000/elite-traders");
    console.log("   Best Bets: http://localhost:3000/best-bets");
    
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err);
    await sql.end();
    process.exit(1);
  }
}

populateEliteTraders();
