import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = {
  title: "Polybuddy - Prediction Market Intelligence",
  description: "Smart trading insights for prediction markets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
