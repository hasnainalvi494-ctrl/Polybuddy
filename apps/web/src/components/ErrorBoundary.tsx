"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-[#111111] border border-red-500/30 rounded-lg p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">⚠️</span>
              <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
            </div>
            
            <p className="text-gray-400 mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {this.state.error && (
              <details className="mb-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-[#0a0a0a] p-3 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

