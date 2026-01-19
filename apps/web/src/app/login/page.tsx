"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";

// Dynamically import wallet components to avoid SSR issues
const WalletConnectSection = dynamic(
  () => import("@/components/WalletConnectSection"),
  { ssr: false, loading: () => <WalletPlaceholder /> }
);

function WalletPlaceholder() {
  return (
    <div className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 px-6 rounded-xl font-medium opacity-50">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      Loading wallet...
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Form state
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle email form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isSignup) {
        await signup(email, password, name || undefined);
      } else {
        await login(email, password);
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#0a0f14] flex items-center justify-center p-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-700 border-t-teal-500"></div>
      </main>
    );
  }

  // Don't render if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0a0f14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-xl text-white">PolyBuddy</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-gray-400">
            {isSignup ? "Start tracking elite traders today" : "Sign in to continue to PolyBuddy"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#111820] border border-[#243040] rounded-2xl p-6">
          {/* Wallet Connect Section */}
          <div className="mb-6">
            <WalletConnectSection onError={setError} />
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#243040]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#111820] text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Name (optional)
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1a222c] border border-[#243040] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-[#1a222c] border border-[#243040] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-[#1a222c] border border-[#243040] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1a222c] border border-[#243040] text-white py-2.5 px-4 rounded-xl font-medium hover:bg-[#243040] hover:border-[#36455a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "Loading..." : isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Toggle signup/login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
              className="text-teal-400 hover:text-teal-300 text-sm transition-colors"
            >
              {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to PolyBuddy
          </Link>
        </div>
      </div>
    </main>
  );
}
