# Phase 0: Project Initialization — Code Review & Kanban Tasks

> **Timeline**: Week 1  
> **Priority**: Critical — no other phase can begin without this  
> **Tech Stack**: Node.js 20 LTS, npm Workspaces, TypeScript, Hardhat, Next.js 14, Husky, Prettier

---

## Overview

This phase scaffolds the production-grade monorepo, installs tooling, and validates the development environment before writing a single line of contract or UI code. Every task in this phase is a **blocker** for Phase 1 and Phase 2.

---

## Task Breakdown

---

### P0-INIT-001: Create Monorepo Directory Structure
**Title**: Scaffold Root Monorepo with `contracts/` and `frontend/` Workspaces

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 1 |
| Dependencies | None |
| Labels | `setup`, `infrastructure` |

**Description**:  
Create the root project structure that separates smart contract code from the frontend while keeping them in the same repository via npm workspaces.

**Acceptance Criteria**:
- [ ] Root directory initialized as an npm workspace project
- [ ] `contracts/` directory created for Solidity / Hardhat code
- [ ] `frontend/` directory created for Next.js app
- [ ] `docs/` directory created for all phase documentation
- [ ] Root `package.json` defines `"workspaces": ["contracts", "frontend"]`

**Files to Create**:
```
package.json
contracts/  (directory)
frontend/   (directory)
docs/       (directory)
```

---

### P0-INIT-002: Initialize Hardhat TypeScript Project
**Title**: Set Up Hardhat Development Environment in `/contracts`

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 2 |
| Dependencies | P0-INIT-001 |
| Labels | `contracts`, `setup`, `hardhat` |

**Description**:  
Initialize Hardhat inside the `contracts/` workspace with TypeScript configuration, Solidity 0.8.24 compiler, and all required plugins.

**Acceptance Criteria**:
- [ ] `npx hardhat init` run inside `contracts/` with TypeScript template
- [ ] `hardhat.config.ts` configured with compiler version `0.8.24`
- [ ] Optimizer enabled in hardhat config (`runs: 200`, `viaIR: true`)
- [ ] Network configs: `hardhat`, `localhost`, `sepolia`
- [ ] Plugins installed: `@nomicfoundation/hardhat-toolbox`, `hardhat-gas-reporter`, `solidity-coverage`
- [ ] `contracts/tsconfig.json` with strict TypeScript mode

**Files to Create**:
```
contracts/hardhat.config.ts
contracts/tsconfig.json
contracts/package.json
```

---

### P0-INIT-003: Initialize Next.js 14 Application
**Title**: Scaffold Next.js App with App Router and TypeScript in `/frontend`

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 2 |
| Dependencies | P0-INIT-001 |
| Labels | `frontend`, `setup`, `nextjs` |

**Description**:  
Create the React frontend using Next.js 14 App Router. This serves as the foundation for all UI work in Phase 2.

**Acceptance Criteria**:
- [ ] Next.js app created via `npx create-next-app@latest`
- [ ] App Router, TypeScript, and `src/` directory layout selected
- [ ] Import alias `@/*` configured in `tsconfig.json`
- [ ] `frontend/` dev server runs successfully on `http://localhost:3000`
- [ ] Web3 dependencies installed: `ethers@^6`, `@tanstack/react-query`, `framer-motion`

**Files to Create**:
```
frontend/next.config.mjs
frontend/tsconfig.json
frontend/src/app/layout.tsx
frontend/src/app/page.tsx
```

---

### P0-INIT-004: Configure Shared Code Quality Tooling
**Title**: Set Up ESLint, Prettier, and Husky Pre-Commit Hooks

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 2 |
| Dependencies | P0-INIT-002, P0-INIT-003 |
| Labels | `dx`, `tooling`, `ci` |

**Description**:  
Enforce consistent formatting and linting across both workspaces to prevent style-related code review issues.

**Acceptance Criteria**:
- [ ] `.prettierrc` configured at root with `prettier-plugin-solidity` support
- [ ] Solidity files formatted to 4-space indentation
- [ ] TypeScript/TSX files formatted to 2-space indentation
- [ ] Husky initialized: `npx husky install`
- [ ] `lint-staged` configured to run Prettier on staged files before commit
- [ ] `npm run lint` command works from root

**Files to Create**:
```
.prettierrc
.husky/pre-commit
.lint-staged config in root package.json
```

---

### P0-INIT-005: Create `.env` Templates
**Title**: Define Environment Variable Templates for All Workspaces

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 1 |
| Dependencies | P0-INIT-002, P0-INIT-003 |
| Labels | `security`, `config` |

**Description**:  
Establish the environment variable protocol. No secrets should ever be committed. All config is driven via `.env`.

**Acceptance Criteria**:
- [ ] `.env.example` created at root with all required variable placeholders
- [ ] Blockchain variables: `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY`
- [ ] Frontend variables prefixed with `NEXT_PUBLIC_`: chain ID, contract addresses, WalletConnect project ID
- [ ] `.gitignore` excludes `.env` and `.env.local` but tracks `.env.example`
- [ ] `README.md` mentions the first-time setup `cp .env.example .env` step

**Files to Create**:
```
.env.example
.gitignore
```

---

## Phase 0 Full Completion Checklist

| Task ID | Title | Priority | Hours | Status |
|---------|-------|----------|-------|--------|
| P0-INIT-001 | Monorepo Directory Structure | P0 | 1 | ⬜ |
| P0-INIT-002 | Hardhat TypeScript Init | P0 | 2 | ⬜ |
| P0-INIT-003 | Next.js 14 App Init | P0 | 2 | ⬜ |
| P0-INIT-004 | Code Quality Tooling | P1 | 2 | ⬜ |
| P0-INIT-005 | `.env` Templates | P1 | 1 | ⬜ |
| **Total** | | | **8 hrs** | |

---

## Success Criteria (Phase Gate)

Before progressing to Phase 1, the following must pass:

- [ ] `npm install` at root installs all workspace packages without error
- [ ] `npx hardhat compile` (empty project) succeeds in `contracts/`
- [ ] `npm run dev` starts `localhost:3000` successfully in `frontend/`
- [ ] `npm run lint` passes from root
- [ ] No `.env` secrets are present in `git status`
- [ ] Git hooks fire correctly on a test commit
