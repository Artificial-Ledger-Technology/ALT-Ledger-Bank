# 🚀 Phase 0 — Project Initialization

> **ALT-Ledger-Bank** · Decentralized Banking DApp  
> Phase Goal: Scaffold a production-grade monorepo, configure all tooling, and validate the development environment before writing a single line of contract or UI code.

---

## 📋 Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Monorepo Architecture Decision](#monorepo-architecture-decision)
3. [Prerequisites Checklist](#prerequisites-checklist)
4. [Directory Scaffold](#directory-scaffold)
5. [Root Workspace Setup](#root-workspace-setup)
6. [Hardhat Project Setup](#hardhat-project-setup)
7. [Next.js Project Setup](#nextjs-project-setup)
8. [Environment Variables](#environment-variables)
9. [Code Quality Tooling](#code-quality-tooling)
10. [Git Configuration](#git-configuration)
11. [Validation Checklist](#validation-checklist)
12. [Common Pitfalls & Fixes](#common-pitfalls--fixes)

---

## Overview & Goals

Phase 0 is the foundation. A poorly initialized project leads to cascading refactors, dependency hell, and environment inconsistencies later on. This phase ensures:

- ✅ **Reproducible environment** — any team member can clone and run with zero guessing
- ✅ **Typed throughout** — TypeScript in both contracts tooling and frontend
- ✅ **Separation of concerns** — `contracts/` and `frontend/` are isolated but share root-level config
- ✅ **Security-first** — secrets never committed; `.env.example` is the source of truth
- ✅ **Lint + format on commit** — `husky` + `lint-staged` block bad code at the gate

---

## Monorepo Architecture Decision

We use an **npm workspace monorepo** (not Turborepo) for simplicity and broad tooling compatibility.

```
ALT-Ledger-Bank/          ← Git root / npm workspace root
├── contracts/             ← Hardhat sub-project (Solidity)
├── frontend/              ← Next.js sub-project (React/TypeScript)
├── docs/                  ← All phase documentation (this folder)
├── .env.example           ← Committed env template
├── .gitignore             ← Root-level ignores
└── package.json           ← Workspace root
```

**Why not Turborepo?**  
Turborepo adds parallelism and caching value at scale. For this project, vanilla npm workspaces provide clarity, minimal config overhead, and easier CI setup — ideal for a portfolio/demo project.

---

## Prerequisites Checklist

Run each command and confirm the output before proceeding.

| Tool | Minimum Version | Verify Command |
|------|----------------|----------------|
| Node.js | `>= 20.0.0` | `node --version` |
| npm | `>= 10.0.0` | `npm --version` |
| Git | `>= 2.40.0` | `git --version` |
| MetaMask | Browser extension | Manual check |

> [!IMPORTANT]
> Use **Node.js 20 LTS**. Hardhat has known issues with Node 21+ experimental features.

```bash
# Recommended: use nvm to manage Node version
nvm install 20
nvm use 20
node --version   # should print v20.x.x
```

---

## Directory Scaffold

Create the full directory tree before running any `init` commands:

```bash
# Run from project root: c:\Users\flexycode\Desktop\ALT-Ledger-Bank\

mkdir -p contracts/contracts/core
mkdir -p contracts/contracts/security
mkdir -p contracts/contracts/interfaces
mkdir -p contracts/contracts/libraries
mkdir -p contracts/scripts
mkdir -p contracts/test
mkdir -p contracts/deployments

mkdir -p frontend/src/app
mkdir -p frontend/src/components
mkdir -p frontend/src/hooks
mkdir -p frontend/src/providers
mkdir -p frontend/src/services/abis
mkdir -p frontend/src/types
mkdir -p frontend/src/utils
mkdir -p frontend/public/assets

mkdir -p docs
```

---

## Root Workspace Setup

### `package.json` (Root)

```json
{
  "name": "alt-ledger-bank",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "contracts",
    "frontend"
  ],
  "scripts": {
    "contracts:compile": "npm run compile --workspace=contracts",
    "contracts:test":    "npm run test --workspace=contracts",
    "contracts:deploy":  "npm run deploy:local --workspace=contracts",
    "frontend:dev":      "npm run dev --workspace=frontend",
    "frontend:build":    "npm run build --workspace=frontend",
    "dev": "concurrently \"npm run contracts:deploy\" \"npm run frontend:dev\"",
    "lint": "npm run lint --workspaces",
    "prepare": "husky install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "husky": "^9.0.11",
    "lint-staged": "^15.2.2",
    "prettier": "^3.2.5"
  },
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "**/*.sol": ["prettier --plugin prettier-plugin-solidity --write"]
  }
}
```

### Install Root Dependencies

```bash
npm install
npx husky install
```

---

## Hardhat Project Setup

```bash
cd contracts

# Initialize Hardhat TypeScript project
npx hardhat init
# Select: "Create a TypeScript project"
# Accept all defaults

# Install core dependencies
npm install --save-dev \
  @nomicfoundation/hardhat-toolbox \
  @nomicfoundation/hardhat-verify \
  @openzeppelin/contracts \
  @openzeppelin/contracts-upgradeable \
  @chainlink/contracts \
  hardhat-gas-reporter \
  solidity-coverage \
  dotenv \
  ts-node \
  typescript

npm install --save-dev @types/node @types/mocha @types/chai
```

### `contracts/hardhat.config.ts`

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
const SEPOLIA_RPC  = process.env.SEPOLIA_RPC_URL     || "";
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY  || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,                              // Enable via-IR for advanced optimization
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.CMC_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true,
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
```

### `contracts/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["./contracts", "./scripts", "./test"],
  "exclude": ["node_modules", "artifacts", "cache"]
}
```

---

## Next.js Project Setup

```bash
cd ../frontend

# Scaffold Next.js 14 with App Router + TypeScript
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-experimental-app

# Install Web3 & UI dependencies
npm install \
  ethers@^6.11.1 \
  @web3modal/ethers \
  @tanstack/react-query \
  framer-motion \
  recharts \
  react-hot-toast \
  clsx

npm install --save-dev \
  @types/node \
  @types/react \
  @types/react-dom
```

> [!NOTE]
> We use **Ethers.js v6** (not v5). The API changed significantly — `ethers.providers` → `ethers.BrowserProvider`, `BigNumber` → native `bigint`, etc. All contract hooks will use v6 syntax.

### `frontend/tsconfig.json` (key additions)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "paths": {
      "@/*": ["./src/*"],
      "@contracts/*": ["./src/services/abis/*"]
    }
  }
}
```

---

## Environment Variables

### `.env.example` (committed to Git)

```dotenv
# ── Blockchain ──────────────────────────────────────────────
# RPC endpoint for Sepolia testnet (Alchemy / Infura)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Wallet private key for contract deployment (NEVER commit real keys)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# ── API Keys ─────────────────────────────────────────────────
# Etherscan API key for contract verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# CoinMarketCap API key for gas reporter USD conversion
CMC_API_KEY=YOUR_CMC_KEY

# ── Feature Flags ────────────────────────────────────────────
# Set to "true" to enable Hardhat gas reporter
REPORT_GAS=false

# ── Frontend (Next.js public env — prefix with NEXT_PUBLIC_) ──
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ALT_TOKEN_ADDRESS=
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_LENDING_POOL_ADDRESS=
NEXT_PUBLIC_GOVERNANCE_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_WC_PROJECT_ID
```

### `.env` (NOT committed — add to .gitignore)

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

---

## Code Quality Tooling

### `.prettierrc` (root)

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-solidity"],
  "overrides": [
    {
      "files": "*.sol",
      "options": {
        "compiler": "0.8.24",
        "tabWidth": 4
      }
    }
  ]
}
```

### `.eslintrc.json` (frontend)

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

---

## Git Configuration

### `.gitignore` (root)

```gitignore
# Environment
.env
.env.local
.env.production

# Node
node_modules/
npm-debug.log*

# Hardhat
contracts/cache/
contracts/artifacts/
contracts/deployments/localhost/
contracts/gas-report.txt
contracts/coverage/
contracts/coverage.json

# Next.js
frontend/.next/
frontend/out/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(contracts): add ALTBankVault deposit function
fix(frontend): resolve wallet connection race condition
test(contracts): add lending pool liquidation edge cases
chore(deps): upgrade ethers to v6.11.1
docs: update Phase 1 smart contract spec
```

---

## Validation Checklist

Run these checks at the end of Phase 0 before proceeding to Phase 1:

```bash
# 1. Node version correct
node --version                          # Must be v20.x.x

# 2. Contracts compile with no errors
cd contracts && npx hardhat compile

# 3. Frontend dev server starts
cd ../frontend && npm run dev           # Should open http://localhost:3000

# 4. Prettier formats Solidity without crash
npx prettier --check "contracts/**/*.sol"

# 5. TypeScript check passes
cd contracts && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit

# 6. Git hooks installed
ls .husky/                              # Should show pre-commit hook
```

✅ All checks pass → proceed to **Phase 1: Smart Contract Development**

---

## Common Pitfalls & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| `npx hardhat compile` fails with `viaIR` | Old Solidity compiler version | Ensure `solidity: "0.8.24"` in config |
| `ethers` type errors | Mixing v5 and v6 imports | Uninstall v5; `npm install ethers@^6` |
| MetaMask not detected | Wrong `window.ethereum` access | Use `typeof window !== "undefined"` guard |
| `.env` not loaded in Hardhat | `dotenv.config()` path wrong | Use `dotenv.config({ path: "../.env" })` from `contracts/` |
| `NEXT_PUBLIC_*` undefined | Forgetting prefix | All client-side vars need `NEXT_PUBLIC_` prefix |
| `husky: not found` | Husky not initialized | Run `npx husky install` from root |

---

*Phase 0 complete. Next → [Phase 1: Smart Contract Development](./PHASE_1_SMART_CONTRACTS.md)*
