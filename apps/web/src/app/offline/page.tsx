"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <span className="text-8xl mb-6 block">📡</span>
        <h1 className="text-3xl font-bold text-white mb-4">You're Offline</h1>
        <p className="text-gray-400 mb-8">
          It looks like you've lost your internet connection. Some features may not be available
          until you're back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-8 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

