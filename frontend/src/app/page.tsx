"use client";

import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Background gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-alt-deep via-alt-navy to-alt-deep" />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-alt-cyan/10 blur-3xl animate-float" />
      <div
        className="absolute bottom-1/3 right-1/3 w-96 h-96 rounded-full bg-alt-violet/10 blur-3xl animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full bg-alt-blue/10 blur-3xl animate-float"
        style={{ animationDelay: "4s" }}
      />

      {/* Content card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 glass-card p-12 max-w-2xl mx-4 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-alt-cyan to-alt-blue bg-clip-text text-transparent">
            ALT-Ledger-Bank
          </h1>
          <div className="mt-2 h-1 w-24 mx-auto bg-gradient-to-r from-alt-cyan to-alt-blue rounded-full" />
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg text-white/60 mb-8 leading-relaxed"
        >
          The Future of Decentralized Banking — Deposit, Borrow, and Earn Yield without traditional
          banks. Powered by Ethereum smart contracts.
        </motion.p>

        {/* Status badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          <span className="px-3 py-1 text-xs font-medium rounded-full border border-alt-cyan/30 text-alt-cyan bg-alt-cyan/5">
            Solidity 0.8.24
          </span>
          <span className="px-3 py-1 text-xs font-medium rounded-full border border-alt-violet/30 text-alt-violet bg-alt-violet/5">
            Next.js 14
          </span>
          <span className="px-3 py-1 text-xs font-medium rounded-full border border-alt-blue/30 text-alt-blue bg-alt-blue/5">
            Ethers.js v6
          </span>
          <span className="px-3 py-1 text-xs font-medium rounded-full border border-green-400/30 text-green-400 bg-green-400/5">
            ERC-4626
          </span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex justify-center gap-4"
        >
          <button className="btn-gradient" disabled>
            🔗 Connect Wallet
          </button>
          <a
            href="https://github.com/Artificial-Ledger-Technology/ALT-Ledger-Bank"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            ⭐ View on GitHub
          </a>
        </motion.div>

        {/* Phase indicator */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-8 text-xs text-white/30"
        >
          Phase 0 Complete · Smart Contract Development Coming Soon
        </motion.p>
      </motion.div>
    </div>
  );
}
