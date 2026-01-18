"use client";

import { useState } from "react";

interface PositionResult {
  positionAmount: number;
  positionShares: number;
  riskPercentage: number;
  kellyPercentage: number;
  stopLoss: number;
  takeProfit: number;
  maxLoss: number;
  maxGain: number;
  expectedValue: number;
  riskRewardRatio: number;
  recommendation: string;
  warnings: string[];
  maxDrawdownRisk: number;
  portfolioImpact: number;
  diversificationScore: number;
}

interface Analysis {
  edgeAnalysis: string;
  riskAssessment: string;
  positioningAdvice: string;
  diversificationAdvice: string;
}

export default function PositionCalculator() {
  const [bankroll, setBankroll] = useState<number>(50000);
  const [marketPrice, setMarketPrice] = useState<number>(0.65);
  const [expectedProbability, setExpectedProbability] = useState<number>(0.75);
  const [riskTolerance, setRiskTolerance] = useState<'aggressive' | 'moderate' | 'conservative'>('moderate');
  const [currentExposure, setCurrentExposure] = useState<number>(0);
  
  const [result, setResult] = useState<{ position: PositionResult; analysis: Analysis } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePosition = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://polybuddy-api-production.up.railway.app/api/positions/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankroll,
          marketPrice,
          expectedProbability,
          riskTolerance,
          currentExposure: currentExposure || 0,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to calculate position');
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const edge = ((expectedProbability - marketPrice) * 100).toFixed(1);
  const edgeColor = parseFloat(edge) > 10 ? 'text-green-600' :
                    parseFloat(edge) > 5 ? 'text-blue-600' :
                    parseFloat(edge) > 0 ? 'text-yellow-600' :
                    'text-red-600';

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Position Size Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate optimal position size using Kelly Criterion with professional risk management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Input Parameters
          </h2>

          {/* Bankroll */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total Bankroll
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                placeholder="50000"
              />
            </div>
          </div>

          {/* Market Price */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market Price
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.99"
                value={marketPrice}
                onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 0.5)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
              <span className="absolute right-3 top-3 text-gray-500">
                {(marketPrice * 100).toFixed(0)}¢
              </span>
            </div>
          </div>

          {/* Expected Probability */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Expected Probability
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={expectedProbability}
                onChange={(e) => setExpectedProbability(parseFloat(e.target.value) || 0.5)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
              <span className="absolute right-3 top-3 text-gray-500">
                {(expectedProbability * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Edge Display */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your Edge:</span>
              <span className={`text-2xl font-bold ${edgeColor}`}>
                {parseFloat(edge) > 0 ? '+' : ''}{edge}%
              </span>
            </div>
          </div>

          {/* Risk Tolerance */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Risk Tolerance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['conservative', 'moderate', 'aggressive'] as const).map((tolerance) => (
                <button
                  key={tolerance}
                  onClick={() => setRiskTolerance(tolerance)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    riskTolerance === tolerance
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tolerance.charAt(0).toUpperCase() + tolerance.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Current Exposure */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Exposure (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                value={currentExposure}
                onChange={(e) => setCurrentExposure(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculatePosition}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating...' : 'Calculate Position Size'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Calculation Results
          </h2>

          {!result ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400">
                Enter your parameters and click Calculate to see results
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recommendation Badge */}
              <div className={`p-4 rounded-lg text-center ${
                result.position.recommendation === 'aggressive' ? 'bg-green-100 dark:bg-green-900/20' :
                result.position.recommendation === 'moderate' ? 'bg-blue-100 dark:bg-blue-900/20' :
                result.position.recommendation === 'conservative' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                'bg-red-100 dark:bg-red-900/20'
              }`}>
                <div className="text-2xl font-bold text-gray-900 dark:text-white uppercase">
                  {result.position.recommendation} Recommendation
                </div>
              </div>

              {/* Position Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Position Amount</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${result.position.positionAmount.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Shares</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {result.position.positionShares.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Kelly %</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.position.kellyPercentage.toFixed(1)}%
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Risk %</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {result.position.riskPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Risk Management
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Stop Loss:</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {(result.position.stopLoss * 100).toFixed(1)}¢
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Take Profit:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {(result.position.takeProfit * 100).toFixed(1)}¢
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Max Loss:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${result.position.maxLoss.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Expected Value:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      +${result.position.expectedValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Risk/Reward:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {result.position.riskRewardRatio.toFixed(2)}:1
                    </span>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Analysis
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="font-medium text-blue-900 dark:text-blue-300">Edge: </span>
                    <span className="text-gray-700 dark:text-gray-300">{result.analysis.edgeAnalysis}</span>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="font-medium text-purple-900 dark:text-purple-300">Risk: </span>
                    <span className="text-gray-700 dark:text-gray-300">{result.analysis.riskAssessment}</span>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="font-medium text-green-900 dark:text-green-300">Advice: </span>
                    <span className="text-gray-700 dark:text-gray-300">{result.analysis.positioningAdvice}</span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {result.position.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                    ⚠️ Warnings:
                  </h4>
                  <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-400">
                    {result.position.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
