"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function test() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://polybuddy-api-production.up.railway.app";
      console.log("Testing with API_URL:", API_URL);
      
      const tests = {
        health: `${API_URL}/health`,
        bestBets: `${API_URL}/api/best-bets-signals`,
        markets: `${API_URL}/api/markets?limit=3`,
        eliteTraders: `${API_URL}/api/elite-traders?limit=3`,
      };

      const testResults: any = {};

      for (const [name, url] of Object.entries(tests)) {
        try {
          console.log(`Testing ${name}:`, url);
          const response = await fetch(url, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });
          
          if (!response.ok) {
            testResults[name] = {
              error: `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
            };
          } else {
            const data = await response.json();
            testResults[name] = {
              success: true,
              data: JSON.stringify(data).substring(0, 200) + "...",
              fullData: data,
            };
          }
        } catch (error: any) {
          testResults[name] = {
            error: error.message,
            stack: error.stack,
          };
        }
      }

      console.log("Test results:", testResults);
      setResults(testResults);
      setLoading(false);
    }

    test();
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-black text-green-400 font-mono min-h-screen">
        <h1 className="text-2xl mb-4">🔍 Testing API Connection...</h1>
      </div>
    );
  }

  return (
    <div className="p-8 bg-black text-green-400 font-mono min-h-screen">
      <h1 className="text-2xl mb-4">🔍 API Debug Results</h1>
      
      <div className="mb-4 p-4 border border-green-400">
        <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || "https://polybuddy-api-production.up.railway.app"}
      </div>

      {Object.entries(results).map(([name, result]: [string, any]) => (
        <div key={name} className="mb-6 p-4 border border-green-400">
          <h2 className="text-xl mb-2">
            {result.error ? "❌" : "✅"} {name}
          </h2>
          
          {result.error ? (
            <div className="text-red-400">
              <p><strong>Error:</strong> {result.error}</p>
              {result.stack && (
                <pre className="text-xs mt-2 overflow-auto">
                  {result.stack}
                </pre>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm mb-2">{result.data}</p>
              
              {result.fullData && (
                <details className="mt-2">
                  <summary className="cursor-pointer">View full response</summary>
                  <pre className="text-xs mt-2 overflow-auto max-h-96 bg-gray-900 p-2">
                    {JSON.stringify(result.fullData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
