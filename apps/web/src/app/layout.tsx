import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PolyBuddy - Prediction Market Signals",
  description: "Live structural signals across prediction markets. See where retail traders can compete — and where hidden risks quietly punish late or crowded entries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white`}>
        <Providers>
          <Navigation />
          <div className="pb-16 md:pb-0">{children}</div>
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
