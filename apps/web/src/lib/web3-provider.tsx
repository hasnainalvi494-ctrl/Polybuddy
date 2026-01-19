"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { config } from "./wagmi-config";
import "@rainbow-me/rainbowkit/styles.css";

// Create a separate query client for wagmi to avoid conflicts
const wagmiQueryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration issues - only render wallet providers on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, just render children without wallet providers
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={wagmiQueryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#14b8a6", // Teal to match our theme
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
