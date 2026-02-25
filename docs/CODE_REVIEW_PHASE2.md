# Phase 2: Frontend Development — Code Review & Kanban Tasks

> **Timeline**: Weeks 6–9  
> **Priority**: High  
> **Tech Stack**: Next.js 14 (App Router), TypeScript, Ethers.js v6, Framer Motion, Recharts, Tailwind CSS

---

## Overview

Build the complete premium Web3 banking interface. All tasks are organized by concern: design system first, wallet integration second, pages third, and shared components last. Every sub-task from the master checklist is represented with specific acceptance criteria and file targets.

---

## Task Breakdown — Design System & Global Styles

---

### P2-FE-001: Deep-Blue Particle Background
**Title**: Build Animated Bokeh Particle Canvas (ALTBank Visual Identity)

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 6 |
| Dependencies | P0-INIT-004 |
| Labels | `frontend`, `ui`, `animation`, `canvas` |

**Description**:  
The signature visual from the ALTBank screenshots — animated floating bokeh orbs (blue/pink/white) on a deep navy canvas. Must be performant (requestAnimationFrame, resizes on viewport change) and used across all pages.

**Acceptance Criteria**:
- [ ] `<ParticleBackground />` renders a full-viewport `<canvas>` element behind all content
- [ ] 60+ animated particles of varying radius (3–20px) and opacity (0.1–0.6)
- [ ] Color palette: `#1a6bc4` (blue), `#7c3aed` (violet), `#06b6d4` (cyan), white
- [ ] Gaussian blur CSS filter applied to canvas for bokeh effect
- [ ] Canvas resizes correctly on `window.resize` event
- [ ] `requestAnimationFrame` loop — no `setInterval`
- [ ] Zero layout shift — positioned `fixed` behind all page content

**Files to Create**:
```
frontend/src/components/ParticleBackground.tsx
```

---

### P2-FE-002: Glassmorphism Design System
**Title**: Implement Global CSS Tokens, Glassmorphism Cards, and Gradient Utilities

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 4 |
| Dependencies | P0-INIT-003 |
| Labels | `frontend`, `design-system`, `css` |

**Description**:  
Define the core visual language: CSS custom properties, glassmorphism base classes, gradient button styles, and typography scale used everywhere.

**Acceptance Criteria**:
- [ ] CSS custom properties defined: `--bg-deep: #0a1628`, `--cyan: #06b6d4`, `--glass-bg`, `--glass-border`
- [ ] `.glass-card` utility class: `backdrop-blur`, `bg-white/5`, `border border-white/10`, `rounded-2xl`
- [ ] `.btn-gradient` class: cyan-to-blue gradient with `hover:brightness-110` and `box-shadow` glow
- [ ] Google Fonts imported: `Inter` — applied as `font-family` on `body`
- [ ] Keyframe animations: `@keyframes float`, `@keyframes pulse-glow`
- [ ] Responsive breakpoints confirmed working at 375px / 768px / 1280px

**Files to Create**:
```
frontend/src/app/globals.css
```

---

### P2-FE-003: Responsive Layout Foundation
**Title**: Set Up Mobile-First Responsive Layout with Navigation

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 4 |
| Dependencies | P2-FE-001, P2-FE-002 |
| Labels | `frontend`, `layout`, `responsive` |

**Description**:  
Root layout with the `<Navbar>` and responsive sidebar/hamburger pattern that frames all pages.

**Acceptance Criteria**:
- [ ] `layout.tsx` wraps all pages in `<ParticleBackground>` and `<Navbar>`
- [ ] `<Navbar>` contains: `ALTBank` logo (left) + `Wallet | Exchange | Explore | Login` links (right)
- [ ] Mobile hamburger menu collapses navigation below 768px breakpoint
- [ ] Sticky navigation with glassmorphism background at scroll
- [ ] `<Footer>` with copyright and social links

**Files to Create**:
```
frontend/src/app/layout.tsx
frontend/src/components/Navbar.tsx
frontend/src/components/Footer.tsx
```

---

## Task Breakdown — Core Pages

---

### P2-FE-004: Landing Page — Hero Carousel & Login Panel
**Title**: Build 3-Slide Hero Carousel with Glassmorphic Login Card

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 8 |
| Dependencies | P2-FE-002, P2-FE-003 |
| Labels | `frontend`, `landing`, `ui` |

**Description**:  
The first impression page. Matches the exact 3-slide carousel pattern and right-side glass login panel shown in the ALTBank screenshots.

**Acceptance Criteria**:
- [ ] Auto-advancing carousel with 5s interval and manual dot navigation
- [ ] Slide 1: "Bank From Anywhere / Rule your Business" (blue bokeh BG)
- [ ] Slide 2: "Crypto Wallet Blockchain" (dark particle BG)
- [ ] Slide 3: "Artificial Ledger Technology Bank" (purple particle BG)
- [ ] Each slide has hero copy, sub-copy, and a "Read More" CTA button matching screenshots
- [ ] Right-side glassmorphic login card: Username, Password, Remember Me, Login, Forgot Password, Register buttons
- [ ] `Login` / `Register` buttons in `btn-gradient` style

**Files to Create**:
```
frontend/src/app/page.tsx
frontend/src/components/HeroCarousel.tsx
frontend/src/components/LoginPanel.tsx
```

---

### P2-FE-005: Dashboard — Portfolio Overview
**Title**: Build User Banking Dashboard with TVL and Yield Stats

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 10 |
| Dependencies | P2-FE-003, P2-FE-008 |
| Labels | `frontend`, `dashboard`, `charts` |

**Description**:  
Post-login view showing user's on-chain balances, protocol stats, and yield history chart.

**Acceptance Criteria**:
- [ ] Stats row: Total Deposited, Outstanding Borrows, Net APY, Health Factor — fetched from contract hooks
- [ ] Recharts area chart showing 30-day synthetic yield history
- [ ] "Quick Actions" row: Deposit, Withdraw, Borrow, Repay buttons linking to respective pages
- [ ] Recent Transactions table with asset, type, amount, date columns
- [ ] Skeleton loader shown during initial data fetch
- [ ] All numbers formatted with commas and 2 decimal places

**Files to Create**:
```
frontend/src/app/dashboard/page.tsx
frontend/src/components/StatsCard.tsx
frontend/src/components/YieldChart.tsx
frontend/src/components/TransactionTable.tsx
```

---

### P2-FE-006: Wallet Page — Balances, Send & Receive
**Title**: Build Token Wallet Management Interface

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 8 |
| Dependencies | P2-FE-008 |
| Labels | `frontend`, `wallet`, `web3` |

**Description**:  
Shows user's token holdings, allows sending ERC-20 tokens to any address, and receiving via QR code / address copy.

**Acceptance Criteria**:
- [ ] Asset list with token logo, name, on-chain balance, and USD value
- [ ] "Send" modal: recipient address input, amount, confirm button
- [ ] "Receive" panel: display connected wallet address with copy button
- [ ] Transaction pending state: spinner, TX hash link to Etherscan
- [ ] Token balance fetched using `useVault` hook

**Files to Create**:
```
frontend/src/app/wallet/page.tsx
frontend/src/components/wallet/SendModal.tsx
frontend/src/components/wallet/ReceivePanel.tsx
```

---

### P2-FE-007: Exchange Page — Token Swap UI
**Title**: Build Token Swap and Liquidity Pool Interface

| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Estimated Hours | 8 |
| Dependencies | P2-FE-008 |
| Labels | `frontend`, `exchange`, `defi` |

**Description**:  
Interface for swapping between supported tokens within the protocol.

**Acceptance Criteria**:
- [ ] Input/output token selector with balance display
- [ ] Swap direction toggle with smooth animation
- [ ] Slippage tolerance settings (0.5%, 1%, custom)
- [ ] Price impact indicator with color warning (yellow > 3%, red > 5%)
- [ ] Confirm Swap modal with transaction summary

**Files to Create**:
```
frontend/src/app/exchange/page.tsx
frontend/src/components/exchange/SwapPanel.tsx
```

---

### P2-FE-008: Explore Page — Protocol Stats & Governance
**Title**: Build Protocol Explorer with Live On-Chain Stats and Governance Proposals

| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Estimated Hours | 6 |
| Dependencies | P2-FE-008 |
| Labels | `frontend`, `explore`, `governance` |

**Description**:  
A view of all protocol-level data and active governance proposals.

**Acceptance Criteria**:
- [ ] Global TVL, Total Borrows, Number of Depositors displayed
- [ ] Active governance proposals list with vote counts and status
- [ ] "Vote" button (For / Against) integrates with `ALTBankGovernance` contract
- [ ] Bar chart: top assets by supply volume

**Files to Create**:
```
frontend/src/app/explore/page.tsx
frontend/src/components/governance/ProposalCard.tsx
```

---

### P2-FE-009: Lending Page — Borrow & Supply Interface
**Title**: Build DeFi Lending Operations with Health Factor Indicator

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 10 |
| Dependencies | P2-FE-008 |
| Labels | `frontend`, `lending`, `defi` |

**Description**:  
Interfaces for all four lending operations: supply, withdraw, borrow, repay.

**Acceptance Criteria**:
- [ ] Two-panel layout: "Supply Markets" and "Borrow Markets"
- [ ] Each asset shows APY, liquidity, and user's position
- [ ] Health Factor gauge: green (>1.5), yellow (1.0–1.5), red (<1.0)
- [ ] ERC-20 approval step integrated before supply/borrow
- [ ] Repay with Max button clears outstanding debt

**Files to Create**:
```
frontend/src/app/lending/page.tsx
frontend/src/components/lending/SupplyPanel.tsx
frontend/src/components/lending/BorrowPanel.tsx
frontend/src/components/lending/HealthFactor.tsx
```

---

## Task Breakdown — Web3 Integration

---

### P2-FE-010: MetaMask / WalletConnect Provider
**Title**: Implement Multi-Wallet Connection Context Provider

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 6 |
| Dependencies | P0-INIT-003 |
| Labels | `frontend`, `web3`, `wallet`, `metamask` |

**Description**:  
A React Context wrapping Ethers.js `BrowserProvider` with connect/disconnect lifecycle management.

**Acceptance Criteria**:
- [ ] `<Web3Provider>` wraps entire app in `layout.tsx`
- [ ] `useWallet()` hook exposes: `account`, `chainId`, `balance`, `connect()`, `disconnect()`
- [ ] Network mismatch detected: prompt user to switch to Sepolia (chainId 11155111)
- [ ] Auto-reconnect on page refresh if MetaMask already connected
- [ ] Loading state during wallet connection

**Files to Create**:
```
frontend/src/providers/Web3Provider.tsx
frontend/src/hooks/useWallet.ts
```

---

### P2-FE-011: Contract Service Layer (Typed ABIs & Hooks)
**Title**: Create Typed Contract Instance Hooks for All Solidity Contracts

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 6 |
| Dependencies | P2-FE-010, P1-SC-010 |
| Labels | `frontend`, `web3`, `contracts`, `hooks` |

**Description**:  
Bridge between the React UI and deployed Solidity contracts with full TypeScript safety.

**Acceptance Criteria**:
- [ ] ABI JSON files exported from Hardhat artifacts and placed into `services/abis/`
- [ ] `useContract(abi, address)` — returns a typed `ethers.Contract` connected to signer
- [ ] `useVault()` — exposes `deposit`, `withdraw`, `getShareBalance`, `getAssetBalance`
- [ ] `useLending()` — exposes `supply`, `borrow`, `repay`, `getHealthFactor`
- [ ] `useGovernance()` — exposes `propose`, `castVote`, `getProposals`
- [ ] All read hooks use `@tanstack/react-query` for caching and re-fetching

**Files to Create**:
```
frontend/src/services/abis/  (directory with ABI JSONs)
frontend/src/services/contracts.ts
frontend/src/hooks/useContract.ts
frontend/src/hooks/useVault.ts
frontend/src/hooks/useLending.ts
frontend/src/hooks/useGovernance.ts
```

---

### P2-FE-012: Transaction Manager
**Title**: Implement Transaction Pending/Confirmed State Management

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 5 |
| Dependencies | P2-FE-010 |
| Labels | `frontend`, `web3`, `ux` |

**Description**:  
Handle the async lifecycle of EVM transactions — submitted, pending (mempool), confirmed, failed.

**Acceptance Criteria**:
- [ ] Toast notification on TX submission (with TX hash link to Etherscan)
- [ ] Loading spinner on buttons during pending state
- [ ] Success toast on receipt confirmation (1 block)
- [ ] Error toast: human-readable message for reverted transactions (parsed revert reason)
- [ ] `react-hot-toast` used as notification library

**Files to Create**:
```
frontend/src/hooks/useTransaction.ts
frontend/src/utils/txErrors.ts
```

---

## Task Breakdown — Component Library

---

### P2-FE-013: Navbar, Footer & Sidebar Components
**Title**: Build Global Navigation Components

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 4 |
| Dependencies | P2-FE-002 |
| Labels | `frontend`, `components`, `navigation` |

**Description**:  
The shell components that wrap every page.

**Acceptance Criteria**:
- [ ] Navbar renders `ALTBank` logo + navigation links on all viewport sizes
- [ ] Wallet connection button in Navbar shows address truncated (`0x1234...abcd`)
- [ ] Footer with copyright and links to GitHub, docs, Etherscan

**Files to Create**:
```
frontend/src/components/Navbar.tsx
frontend/src/components/Footer.tsx
```

---

### P2-FE-014: Token Balance Cards & Chart Widgets
**Title**: Build Reusable Data Display Components

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 5 |
| Dependencies | P2-FE-002 |
| Labels | `frontend`, `components`, `ui` |

**Description**:  
Reusable cards and charts used across Dashboard and Lending pages.

**Acceptance Criteria**:
- [ ] `<StatsCard title, value, change, icon>` — glass card with animated count-up on mount
- [ ] `<TokenBalanceCard token, balance, usdValue>` — with token logo placeholder
- [ ] `<YieldChart data>` — Recharts area chart with cyan/blue fill gradient

**Files to Create**:
```
frontend/src/components/StatsCard.tsx
frontend/src/components/TokenBalanceCard.tsx
frontend/src/components/YieldChart.tsx
```

---

### P2-FE-015: Modal System (Confirm TX, Errors)
**Title**: Build Reusable Modal Overlay and Confirmation Pattern

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 4 |
| Dependencies | P2-FE-002 |
| Labels | `frontend`, `components`, `modal` |

**Description**:  
Shared modal component used for transaction confirmations, error display, and token approval prompts.

**Acceptance Criteria**:
- [ ] `<Modal open, onClose, title, children>` — centered overlay with glassmorphism panel
- [ ] Framer Motion slide-in/fade animation on open/close
- [ ] Accessible: `Escape` key closes, background click closes, focus trap inside
- [ ] `<ConfirmTxModal>` shows: action, amount, estimated gas, wallet address
- [ ] `<ErrorModal>` shows: error title, Solidity revert reason (human-readable)

**Files to Create**:
```
frontend/src/components/Modal.tsx
frontend/src/components/ConfirmTxModal.tsx
frontend/src/components/ErrorModal.tsx
```

---

## Phase 2 Full Completion Checklist

| Task ID | Title | Priority | Hours | Status |
|---------|-------|----------|-------|--------|
| P2-FE-001 | Particle Background | P0 | 6 | ⬜ |
| P2-FE-002 | Glassmorphism Design System | P0 | 4 | ⬜ |
| P2-FE-003 | Responsive Layout | P1 | 4 | ⬜ |
| P2-FE-004 | Landing Page + Login Panel | P0 | 8 | ⬜ |
| P2-FE-005 | Dashboard | P1 | 10 | ⬜ |
| P2-FE-006 | Wallet Page | P1 | 8 | ⬜ |
| P2-FE-007 | Exchange Page | P2 | 8 | ⬜ |
| P2-FE-008 | Explore Page | P2 | 6 | ⬜ |
| P2-FE-009 | Lending Page | P1 | 10 | ⬜ |
| P2-FE-010 | Wallet Provider | P0 | 6 | ⬜ |
| P2-FE-011 | Contract Service Layer | P0 | 6 | ⬜ |
| P2-FE-012 | Transaction Manager | P1 | 5 | ⬜ |
| P2-FE-013 | Navigation Components | P1 | 4 | ⬜ |
| P2-FE-014 | Balance Cards & Charts | P1 | 5 | ⬜ |
| P2-FE-015 | Modal System | P1 | 4 | ⬜ |
| **Total** | | | **94 hrs** | |

---

## Success Criteria (Phase Gate)

- [ ] Lighthouse Performance score > 85 on `localhost`
- [ ] Lighthouse Accessibility score > 95
- [ ] Zero `any` types in frontend TypeScript codebase
- [ ] All 6 pages render without console errors
- [ ] Mobile layout verified at 375px width (iPhone SE)
- [ ] Wallet connect, deposit flow, borrow flow — all work end-to-end on local Hardhat node
