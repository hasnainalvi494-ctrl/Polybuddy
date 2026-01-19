"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon } from "wagmi/chains";

// RainbowKit + wagmi configuration
export const config = getDefaultConfig({
  appName: "PolyBuddy",
  projectId: "polybuddy-wallet-connect", // WalletConnect Cloud project ID (placeholder)
  chains: [polygon], // Polymarket uses Polygon
  ssr: true, // Enable server-side rendering support for Next.js
});
