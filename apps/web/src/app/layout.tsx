"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { usePathname } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLaunchPage = pathname === "/";

  return (
    <>
      <ServiceWorkerRegistration />
      {!isLaunchPage && <Navigation />}
      <div className={isLaunchPage ? "" : "pb-16 md:pb-0"}>{children}</div>
      {!isLaunchPage && <MobileBottomNav />}
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0f14] text-white`}>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}
