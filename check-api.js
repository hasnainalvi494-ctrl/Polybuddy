#!/usr/bin/env node

/**
 * API Health Check Script
 * Tests all critical endpoints to diagnose issues
 */

const API_URL = process.env.API_URL || "https://polybuddy-api-production.up.railway.app";

const endpoints = [
  { name: "Health Check", url: "/health" },
  { name: "Ready Check", url: "/ready" },
  { name: "Best Bets", url: "/api/best-bets-signals" },
  { name: "Elite Traders", url: "/api/elite-traders?limit=5" },
  { name: "Whale Activity", url: "/api/whale-activity?limit=5" },
  { name: "Arbitrage", url: "/api/arbitrage" },
];

async function checkEndpoint(endpoint) {
  const url = `${API_URL}${endpoint.url}`;
  const startTime = Date.now();
  
  try {
    console.log(`\n🔍 Testing: ${endpoint.name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`   ❌ FAILED: HTTP ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
      return false;
    }
    
    console.log(`   ✅ SUCCESS (${duration}ms)`);
    
    // Show data summary
    if (data.signals) {
      console.log(`   📊 Signals: ${data.signals.length}`);
    } else if (data.traders) {
      console.log(`   📊 Traders: ${data.traders.length}`);
    } else if (data.trades) {
      console.log(`   📊 Trades: ${data.trades.length}`);
    } else if (data.opportunities) {
      console.log(`   📊 Opportunities: ${data.opportunities.length}`);
    }
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ FAILED (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   PolyBuddy API Health Check              ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`\nAPI URL: ${API_URL}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const endpoint of endpoints) {
    const success = await checkEndpoint(endpoint);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log("\n⚠️  Issues detected:");
    console.log("  1. Check Railway deployment status");
    console.log("  2. Verify DATABASE_URL is configured");
    console.log("  3. Ensure background jobs have run");
    console.log("  4. Check Railway logs for errors");
    process.exit(1);
  } else {
    console.log("\n✅ All endpoints are healthy!");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
