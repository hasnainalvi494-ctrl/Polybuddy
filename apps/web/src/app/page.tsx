"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simulated live feed items
  const feedItems = [
    "User won $1,247 on Trump deportation market",
    "Elite trader placed $5K bet on Brazil Selic rate",
    "New signal: Chile State of Siege - 89% confidence",
    "Whale activity detected: $25K position opened",
    "Market resolved: $12,430 profit distributed",
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Matrix-style background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {mounted && (
          <>
            {/* Falling numbers */}
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={`num-${i}`}
                className="absolute text-cyan-400 font-mono text-xs animate-fall"
                style={{
                  left: `${(i * 3.33)}%`,
                  animationDuration: `${5 + Math.random() * 5}s`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              >
                {Array.from({ length: 20 }).map((_, j) => (
                  <div key={j} className="mb-2">
                    {Math.random() > 0.5 ? '1' : '0'}
                    {Math.floor(Math.random() * 100)}
                  </div>
                ))}
              </div>
            ))}

            {/* Pulse circles */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`pulse-${i}`}
                className="absolute rounded-full border border-indigo-500/30 animate-pulse-ring"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${20 + i * 10}%`,
                  width: `${100 + i * 50}px`,
                  height: `${100 + i * 50}px`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Scanlines effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-scan" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo with glitch effect */}
        <div className="mb-12 text-center">
          <h1 className="text-8xl lg:text-9xl font-black mb-4 relative group cursor-default">
            <span className="relative z-10 bg-gradient-to-r from-cyan-400 via-indigo-400 to-magenta-400 bg-clip-text text-transparent">
              POLYBUDDY
            </span>
            {/* Glitch layers */}
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-indigo-400 to-magenta-400 bg-clip-text text-transparent opacity-50 group-hover:translate-x-1 transition-transform">
              POLYBUDDY
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-magenta-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent opacity-50 group-hover:-translate-x-1 transition-transform">
              POLYBUDDY
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 font-light tracking-[0.3em] uppercase">
            Real-time Market Intelligence
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-1 font-mono">3,970</div>
            <div className="text-xs text-gray-600 uppercase tracking-widest">Markets</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-400 mb-1 font-mono">75.7%</div>
            <div className="text-xs text-gray-600 uppercase tracking-widest">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-magenta-400 mb-1 font-mono animate-pulse">LIVE</div>
            <div className="text-xs text-gray-600 uppercase tracking-widest">Status</div>
          </div>
        </div>

        {/* Enter button */}
        <Link
          href="/markets"
          className="group relative px-16 py-6 text-xl font-bold uppercase tracking-wider overflow-hidden"
        >
          {/* Button background */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-indigo-500 to-magenta-500 opacity-20 group-hover:opacity-40 transition-opacity" />
          
          {/* Animated border */}
          <div className="absolute inset-0 border-2 border-cyan-400 group-hover:border-magenta-400 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-indigo-400 to-magenta-400 opacity-50 animate-border-flow" />
          </div>

          {/* Button text */}
          <span className="relative z-10 flex items-center gap-3 text-white group-hover:text-cyan-400 transition-colors">
            Enter Platform
            <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>

          {/* Hover glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-indigo-500 to-magenta-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
        </Link>

        {/* Additional features in grid */}
        <div className="grid grid-cols-2 gap-4 mt-16 text-sm">
          <div className="flex items-center gap-2 text-cyan-400">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="font-mono">AI SIGNALS</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-400">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            <span className="font-mono">ELITE TRADERS</span>
          </div>
          <div className="flex items-center gap-2 text-magenta-400">
            <div className="w-2 h-2 bg-magenta-400 rounded-full animate-pulse" />
            <span className="font-mono">WHALE TRACKING</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="font-mono">REAL-TIME DATA</span>
          </div>
        </div>
      </div>

      {/* Live feed at bottom */}
      {mounted && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 border-t border-cyan-500/30 py-4 overflow-hidden">
          <div className="flex animate-scroll-left whitespace-nowrap text-sm font-mono">
            {[...feedItems, ...feedItems, ...feedItems].map((item, i) => (
              <div key={i} className="inline-flex items-center mx-8">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse" />
                <span className="text-gray-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fall {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(100vh);
          }
        }
        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.1;
          }
        }
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }
        @keyframes border-flow {
          0% {
            clip-path: inset(0 100% 0 0);
          }
          25% {
            clip-path: inset(0 0 100% 0);
          }
          50% {
            clip-path: inset(0 0 0 100%);
          }
          75% {
            clip-path: inset(100% 0 0 0);
          }
          100% {
            clip-path: inset(0 100% 0 0);
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 3s ease-in-out infinite;
        }
        .animate-scan {
          animation: scan 8s linear infinite;
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
        .animate-border-flow {
          animation: border-flow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
