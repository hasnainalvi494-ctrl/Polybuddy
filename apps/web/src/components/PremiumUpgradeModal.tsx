"use client";

import { useState, useCallback } from "react";

type PremiumUpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PremiumUpgradeModal({ isOpen, onClose }: PremiumUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="bg-gradient-to-b from-emerald-900/40 to-gray-900 px-6 py-8 text-center border-b border-gray-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-950" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">
            Unlock deeper signal context
          </h2>
          <p className="text-gray-400 text-sm">
            See why signals fire and what retail traders typically get wrong.
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6 py-6">
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-100 text-sm">
                  Full signal context
                </p>
                <p className="text-xs text-gray-500">
                  "What this enables" and "What to watch" on every signal
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-100 text-sm">
                  Common pitfalls exposed
                </p>
                <p className="text-xs text-gray-500">
                  Understand why retail traders often misread this signal
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-100 text-sm">
                  Hidden exposure detection
                </p>
                <p className="text-xs text-gray-500">
                  See when different positions are effectively the same bet
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-100 text-sm">
                  Weekly signal reports
                </p>
                <p className="text-xs text-gray-500">
                  Personalized analysis based on your observed patterns
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          <button
            className="w-full py-3.5 px-6 bg-emerald-500 text-gray-950 font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            Unlock
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Trust signal */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-600">
            Cancel anytime · Analysis only · Not trading advice
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for managing the premium upgrade modal
export function usePremiumUpgrade() {
  const [isOpen, setIsOpen] = useState(false);

  const openUpgrade = useCallback(() => setIsOpen(true), []);
  const closeUpgrade = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    openUpgrade,
    closeUpgrade,
  };
}

// Premium status context (simulated for now)
export function usePremiumStatus() {
  // TODO: Replace with actual auth/subscription check
  const isPremium = false; // Simulated: user is not premium

  return {
    isPremium,
  };
}
