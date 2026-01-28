#!/usr/bin/env node

/**
 * PolyBuddy API Health Check & Verification Script
 * Tests all critical endpoints after database cleanup
 */

const API_URL = "https://polybuddy-api-production.up.railway.app";

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    const start = Date.now();
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    const duration = Date.now() - start;
    
    const success = response.status === expectedStatus;
    const icon = success ? '✅' : '❌';
    const color = success ? colors.green : colors.red;
    
    console.log(`${icon} ${color}${name}${colors.reset} (${duration}ms) - Status: ${response.status}`);
    
    if (success && response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = await response.json();
        if (name === "Health Check" && data) {
          console.log(`   Database: ${data.database?.connected ? '✅ Connected' : '❌ Disconnected'}`);
          console.log(`   Latency: ${data.database?.latencyMs}ms`);
        }
        if (name === "Markets" && data.markets) {
          console.log(`   Found: ${data.markets.length} markets`);
        }
        if (name === "Best Bets" && data.signals) {
          console.log(`   Signals: ${data.signals.length} active`);
        }
        if (name === "Elite Traders" && data.traders) {
          console.log(`   Traders: ${data.traders.length} tracked`);
        }
      } catch (e) {
        // JSON parse error, skip
      }
    }
    
    return { success, duration, status: response.status };
  } catch (error) {
    console.log(`❌ ${colors.red}${name}${colors.reset} - ${error.message}`);
    return { success: false, duration: 0, status: 0, error: error.message };
  }
}

async function runHealthCheck() {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}🏥 PolyBuddy API Health Check${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  console.log(`API URL: ${API_URL}\n`);

  const tests = [
    // Critical endpoints
    { name: "Health Check", url: `${API_URL}/health` },
    { name: "API Ready", url: `${API_URL}/ready` },
    
    // Core data endpoints
    { name: "Markets", url: `${API_URL}/api/markets?limit=1` },
    { name: "Categories", url: `${API_URL}/api/markets/categories` },
    { name: "Best Bets", url: `${API_URL}/api/best-bets-signals?limit=1` },
    { name: "Elite Traders", url: `${API_URL}/api/elite-traders?limit=1` },
    
    // Feature endpoints
    { name: "Stats", url: `${API_URL}/api/stats` },
    { name: "Leaderboard", url: `${API_URL}/api/leaderboard?limit=1` },
    { name: "Whale Activity", url: `${API_URL}/api/whale-activity?limit=1` },
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url);
    results.push(result);
    await new Promise(r => setTimeout(r, 500)); // Rate limiting
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = Math.round(
    results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / successful
  );

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}📊 Summary${colors.reset}\n`);
  console.log(`${colors.green}✅ Successful: ${successful}/${tests.length}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}❌ Failed: ${failed}/${tests.length}${colors.reset}`);
  }
  console.log(`⚡ Avg Response Time: ${avgDuration}ms`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  if (successful === tests.length) {
    console.log(`${colors.green}🎉 All systems operational!${colors.reset}\n`);
    return true;
  } else if (successful > 0) {
    console.log(`${colors.yellow}⚠️  Some endpoints are failing${colors.reset}\n`);
    return false;
  } else {
    console.log(`${colors.red}🚨 API is DOWN - Database cleanup needed!${colors.reset}\n`);
    return false;
  }
}

// Run the health check
runHealthCheck()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
