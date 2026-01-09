"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { queryClient, startBackgroundRefetch } from "@/lib/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  // Start background refetch for critical data
  useEffect(() => {
    const cleanup = startBackgroundRefetch();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
