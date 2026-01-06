"use client";

type ProHistoryPlaceholderProps = {
  marketCategory?: string | null;
};

export function ProHistoryPlaceholder({ marketCategory }: ProHistoryPlaceholderProps) {
  const categoryLabel = marketCategory || "similar";

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with lock icon */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Your History in Similar Markets
          </h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
            Pro
          </span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Personalized insights based on your trading history
        </p>
      </div>

      {/* Blurred preview content */}
      <div className="p-5 relative">
        <div className="space-y-4 filter blur-sm select-none pointer-events-none" aria-hidden="true">
          {/* Fake performance summary */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Win rate in {categoryLabel} markets</span>
            <span className="text-sm font-semibold text-green-600">64%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Avg. hold time</span>
            <span className="text-sm font-semibold">3.2 days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Common exit mistake</span>
            <span className="text-sm font-semibold text-orange-600">Exits too early</span>
          </div>

          {/* Fake insights */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Pattern detected</p>
            <p className="text-sm text-gray-600">You tend to chase momentum in short-window crypto markets, entering after 15%+ price moves.</p>
          </div>
        </div>

        {/* Overlay with CTA */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-gray-100/90 dark:from-gray-900/90 to-transparent">
          <div className="text-center px-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              See how you typically perform in {categoryLabel} markets
            </p>
            <button
              disabled
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Feature preview list */}
      <div className="px-5 py-4 bg-gray-100/50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Pro features include
        </p>
        <ul className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Performance breakdown by market type
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Common mistakes detected across similar trades
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Personalized timing and sizing suggestions
          </li>
        </ul>
      </div>
    </div>
  );
}
