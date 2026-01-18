"use client";

import { useState, useEffect } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

export default function DebugPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runTests() {
      const tests: Record<string, any> = {};

      // Test 1: Health check
      try {
        const start = Date.now();
        const res = await fetch(`${API_URL}/health`);
        const data = await res.json();
        tests.health = { 
          status: "✅ OK", 
          time: `${Date.now() - start}ms`,
          data 
        };
      } catch (e: any) {
        tests.health = { status: "❌ FAILED", error: e.message };
      }

      // Test 2: Elite traders
      try {
        const start = Date.now();
        const res = await fetch(`${API_URL}/api/elite-traders?limit=2`);
        const data = await res.json();
        tests.eliteTraders = { 
          status: "✅ OK", 
          time: `${Date.now() - start}ms`,
          count: data.traders?.length || 0,
          sample: data.traders?.[0]?.walletAddress || "none"
        };
      } catch (e: any) {
        tests.eliteTraders = { status: "❌ FAILED", error: e.message };
      }

      // Test 3: Markets
      try {
        const start = Date.now();
        const res = await fetch(`${API_URL}/api/markets?limit=2`);
        const data = await res.json();
        tests.markets = { 
          status: "✅ OK", 
          time: `${Date.now() - start}ms`,
          count: data.data?.length || 0,
          sample: data.data?.[0]?.question?.substring(0, 30) || "none"
        };
      } catch (e: any) {
        tests.markets = { status: "❌ FAILED", error: e.message };
      }

      // Test 4: Best bets
      try {
        const start = Date.now();
        const res = await fetch(`${API_URL}/api/best-bets-signals`);
        const data = await res.json();
        tests.bestBets = { 
          status: "✅ OK", 
          time: `${Date.now() - start}ms`,
          count: data.signals?.length || 0
        };
      } catch (e: any) {
        tests.bestBets = { status: "❌ FAILED", error: e.message };
      }

      // Test 5: Whale activity
      try {
        const start = Date.now();
        const res = await fetch(`${API_URL}/api/whale-activity?limit=2`);
        const data = await res.json();
        tests.whaleActivity = { 
          status: "✅ OK", 
          time: `${Date.now() - start}ms`,
          count: data.trades?.length || 0
        };
      } catch (e: any) {
        tests.whaleActivity = { status: "❌ FAILED", error: e.message };
      }

      setResults(tests);
      setLoading(false);
    }

    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-2">🔧 PolyBuddy Debug Page</h1>
      <p className="text-gray-400 mb-6">API URL: {API_URL}</p>

      {loading ? (
        <div className="text-yellow-400 text-xl animate-pulse">
          Running API tests...
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(results).map(([name, result]) => (
            <div 
              key={name} 
              className={`p-4 rounded-lg border ${
                result.status.includes("✅") 
                  ? "border-green-500 bg-green-500/10" 
                  : "border-red-500 bg-red-500/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg capitalize">
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span>{result.status}</span>
              </div>
              <pre className="mt-2 text-sm text-gray-300 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ))}

          <div className="mt-8 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
            <h2 className="font-bold text-lg mb-2">What this means:</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>If all tests show ✅ - API works, issue is in frontend components</li>
              <li>If tests show ❌ FAILED - There's a CORS or network issue</li>
              <li>Share a screenshot of this page to help debug</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
