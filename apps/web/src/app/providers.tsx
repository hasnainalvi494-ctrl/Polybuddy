"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Web3Provider } from "@/lib/web3-provider";
import { queryClient, startBackgroundRefetch } from "@/lib/queryClient";
import { WhaleToastProvider } from "@/components/WhaleToast";

export function Providers({ children }: { children: React.ReactNode }) {
  // Start background refetch for critical data
  useEffect(() => {
    const cleanup = startBackgroundRefetch();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <ThemeProvider>
          <AuthProvider>
            <WhaleToastProvider>{children}</WhaleToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}
