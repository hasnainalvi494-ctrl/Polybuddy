"use client";

export default function CopyTradingPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Copy Trading</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Coming Soon
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Automated Trade Copying</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Follow and automatically copy trades from elite Polymarket traders. 
            Our copy trading system will allow you to mirror the strategies of top performers.
          </p>
          <div className="text-left space-y-3">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-700 dark:text-gray-300">One-click trade copying from elite traders</p>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-700 dark:text-gray-300">Customizable position sizing and risk management</p>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-700 dark:text-gray-300">Real-time performance tracking</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
