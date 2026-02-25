import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ALT-Ledger-Bank | Decentralized Banking DApp",
  description:
    "A production-grade DeFi banking platform. Deposit, borrow, and earn yield — without traditional banks. Built by Artificial Ledger Technology.",
  keywords: [
    "DeFi",
    "decentralized banking",
    "Solidity",
    "Web3",
    "Ethereum",
    "Next.js",
    "ALT-Ledger-Bank",
  ],
  openGraph: {
    title: "ALT-Ledger-Bank",
    description: "The Future of Decentralized Banking",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {/* TODO: Phase 2 — Wrap with <Web3Provider> and <ParticleBackground /> */}
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
