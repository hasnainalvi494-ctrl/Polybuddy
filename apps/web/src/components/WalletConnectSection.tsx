"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { useAuth } from "@/lib/auth-context";

interface WalletConnectSectionProps {
  onError: (error: string) => void;
}

export default function WalletConnectSection({ onError }: WalletConnectSectionProps) {
  const router = useRouter();
  const { loginWithWallet } = useAuth();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isLoading, setIsLoading] = useState(false);

  const handleWalletSignIn = async () => {
    if (!address || !isConnected) return;
    
    setIsLoading(true);
    onError("");
    
    try {
      // Create message to sign
      const message = `Sign in to PolyBuddy\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;
      
      // Request signature
      const signature = await signMessageAsync({ message });
      
      // Authenticate with backend
      await loginWithWallet(address, signature, message);
      
      router.replace("/");
    } catch (err) {
      console.error("Wallet sign-in error:", err);
      onError(err instanceof Error ? err.message : "Failed to sign in with wallet");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openConnectModal,
          mounted,
        }) => {
          const connected = mounted && account && chain;

          return (
            <div className="w-full">
              {!connected ? (
                <button
                  onClick={openConnectModal}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 px-6 rounded-xl font-medium hover:shadow-glow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Connect Wallet
                </button>
              ) : (
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between bg-[#1a222c] rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white font-medium">
                        {account.displayName}
                      </span>
                    </div>
                    <button
                      onClick={openAccountModal}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Change
                    </button>
                  </div>
                  
                  <button
                    onClick={handleWalletSignIn}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 px-6 rounded-xl font-medium hover:shadow-glow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      "Sign in with Wallet"
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
