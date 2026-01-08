import { db, markets, retailSignals, whaleActivity, marketBehaviorDimensions } from "@polybuddy/db";
import { desc, sql } from "drizzle-orm";

async function populateDemoData() {
  console.log("🚀 Populating demo data...");

  // Get top 20 active markets
  const activeMarkets = await db
    .select()
    .from(markets)
    .where(sql`resolved = false AND volume > 1000`)
    .orderBy(desc(markets.volume))
    .limit(20);

  console.log(`Found ${activeMarkets.length} active markets`);

  // Generate retail signals for these markets
  let signalsCreated = 0;
  for (const market of activeMarkets.slice(0, 10)) {
    try {
      // Create favorable signals for some markets
      if (Math.random() > 0.5) {
        await db.insert(retailSignals).values({
          id: `signal-favorable-${market.id}`,
          marketId: market.id,
          signalType: "favorable_structure",
          label: "Low Friction Market",
          isFavorable: true,
          confidence: Math.random() > 0.5 ? "high" : "medium",
          whyBullets: [
            { text: "Tight spread", metric: "Spread", value: 0.02, unit: "%" },
            { text: "Deep liquidity", metric: "Depth", value: 50000, unit: "USD" },
            { text: "Stable pricing", metric: "Volatility", value: 2.5, unit: "%" },
          ],
          computedAt: new Date(),
        }).onConflictDoNothing();
        signalsCreated++;
      }

      // Create behavior dimensions
      await db.insert(marketBehaviorDimensions).values({
        id: `behavior-${market.id}`,
        marketId: market.id,
        infoCadence: Math.random(),
        infoStructure: Math.random(),
        liquidityStability: Math.random(),
        timeToResolution: Math.random(),
        participantConcentration: Math.random(),
        clusterType: ["scheduled_event", "continuous_info", "binary_catalyst"][Math.floor(Math.random() * 3)] as any,
        clusterLabel: "Demo Cluster",
        confidence: Math.random() > 0.5 ? "high" : "medium",
        explanation: "Demo market classification",
        retailFriendliness: Math.random() > 0.5 ? "favorable" : "neutral",
        commonRetailMistake: "Chasing price movements",
        computedAt: new Date(),
      }).onConflictDoNothing();

    } catch (error) {
      console.error(`Error creating signal for ${market.id}:`, error);
    }
  }

  console.log(`✅ Created ${signalsCreated} retail signals`);

  // Generate whale activity (mock trades)
  const whaleAddresses = [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0x8e2b5d1a7c4f9b6e3d1a8c5f2b7e4d9a6c3f1b5e",
    "0x7a3f8c4e2b1d9f6a5c8e3b7d4f1a9c6e2b5d8f3a",
    "0x3c5f9e8a2d1b7c4f6e9a3b5d8c2f7e4a1b6d9c5e",
    "0x1f4e7c3a9b2d8f5e6c1a4b7d3e9f2c5a8b6e4d7f",
  ];

  let whaleTradesCreated = 0;
  for (let i = 0; i < 15; i++) {
    const market = activeMarkets[Math.floor(Math.random() * activeMarkets.length)];
    const walletAddress = whaleAddresses[Math.floor(Math.random() * whaleAddresses.length)];
    const action = Math.random() > 0.5 ? "BUY" : "SELL";
    const outcome = Math.random() > 0.5 ? "YES" : "NO";
    const amountUsd = 10000 + Math.random() * 90000; // $10K - $100K
    const price = 0.3 + Math.random() * 0.4; // 0.3 - 0.7
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Last 24 hours

    try {
      await db.insert(whaleActivity).values({
        id: `whale-${market.id}-${i}`,
        walletAddress,
        marketId: market.id,
        action,
        outcome,
        amountUsd: amountUsd.toString(),
        price: price.toString(),
        priceBefore: (price - 0.01).toString(),
        priceAfter: (price + 0.01).toString(),
        timestamp,
      }).onConflictDoNothing();
      whaleTradesCreated++;
    } catch (error) {
      console.error(`Error creating whale trade:`, error);
    }
  }

  console.log(`✅ Created ${whaleTradesCreated} whale trades`);

  console.log("🎉 Demo data population complete!");
}

populateDemoData().catch(console.error);


