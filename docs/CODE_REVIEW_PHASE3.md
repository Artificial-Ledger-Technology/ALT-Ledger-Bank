# Phase 3: Integration & Deployment — Code Review & Kanban Tasks

> **Timeline**: Weeks 10–11  
> **Priority**: Critical  
> **Tech Stack**: Sepolia Testnet, Alchemy, Hardhat Deploy, Etherscan Verify, Vercel, Playwright (E2E)

---

## Overview

This phase connects the smart contracts and frontend in a live environment. All integration tasks validate that the on-chain protocol and the React UI work seamlessly together. The phase ends with a publicly accessible deployment on Vercel and all contracts verified on Etherscan.

---

## Task Breakdown

---

### P3-INT-001: Deploy Contracts to Sepolia Testnet
**Title**: Execute Full Protocol Deployment on Sepolia Public Testnet

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 4 |
| Dependencies | P1-SC-010 (deployment scripts) |
| Labels | `devops`, `deploy`, `blockchain` |

**Description**:  
Run the production deployment script against the public Sepolia network. This is the first time all contracts are live on a shared, persistent blockchain environment.

**Acceptance Criteria**:
- [ ] `DEPLOYER_PRIVATE_KEY` and `SEPOLIA_RPC_URL` set in `.env`
- [ ] `npx hardhat run scripts/deploy.ts --network sepolia` completes without error
- [ ] All 7 contracts deployed in correct order (Token → IRM → Oracle → Timelock → Vault → LendingPool → Governance)
- [ ] Post-deploy configuration script runs: roles granted, price feeds set, collateral factors set
- [ ] Contract addresses logged to `contracts/deployments/sepolia.json`
- [ ] `NEXT_PUBLIC_*` address env vars updated in frontend `.env`

**Files Modified**:
```
contracts/deployments/sepolia.json       (auto-generated)
.env                                     (NEXT_PUBLIC_ addresses updated)
```

---

### P3-INT-002: Etherscan Contract Verification
**Title**: Verify All Deployed Contracts on Etherscan

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 2 |
| Dependencies | P3-INT-001 |
| Labels | `devops`, `etherscan`, `transparency` |

**Description**:  
Source code verification on Etherscan allows users and auditors to read the contract code directly on the block explorer — a critical trust signal.

**Acceptance Criteria**:
- [ ] `ETHERSCAN_API_KEY` configured in `.env`
- [ ] `npx hardhat verify --network sepolia <address>` succeeds for all 7 contracts
- [ ] All contracts show a green checkmark ✅ on Etherscan
- [ ] Etherscan URLs for all contracts documented in project README

---

### P3-INT-003: Price Oracle Feed Configuration on Testnet
**Title**: Link Live Chainlink Sepolia Feeds to PriceOracle Contract

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 2 |
| Dependencies | P3-INT-001 |
| Labels | `contracts`, `oracle`, `config` |

**Description**:  
The `PriceOracle` needs real Chainlink aggregator addresses configured on Sepolia before the LendingPool can calculate collateral values.

**Acceptance Criteria**:
- [ ] Sepolia ETH/USD feed `0x694AA1769357215DE4FAC081bf1f309aDC325306` registered
- [ ] Sepolia USDC/USD feed registered (if applicable)
- [ ] `PriceOracle.getPrice(ETH_ADDRESS)` returns non-zero value on Sepolia
- [ ] Staleness threshold confirmed working against live Sepolia block times

---

### P3-INT-004: Frontend ↔ Contract Integration Testing
**Title**: Validate All Frontend Operations Against Live Sepolia Contracts

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 8 |
| Dependencies | P3-INT-001, P2-FE-011 |
| Labels | `testing`, `integration`, `web3` |

**Description**:  
Manual and browser-based testing of every user flow against the live testnet contracts.

**Acceptance Criteria**:
- [ ] Connect MetaMask to Sepolia — wallet address appears in Navbar
- [ ] Landing page login panel renders without errors
- [ ] Dashboard loads and displays zero balances for a fresh wallet
- [ ] Deposit flow: approve ERC-20 → deposit → `vALT` balance increases on Dashboard
- [ ] Borrow flow: supply collateral → borrow → Health Factor gauge updates
- [ ] Repay flow: repay debt → debt balance reduces
- [ ] Withdraw flow: withdraw vault shares → asset returned to wallet
- [ ] All transaction states: pending toast → confirmed toast → UI reflects new state
- [ ] Reverted transactions: revert reason shown in ErrorModal

---

### P3-INT-005: End-to-End Smoke Tests via Browser
**Title**: Automated E2E Browser Tests for Critical User Journeys

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 6 |
| Dependencies | P3-INT-004 |
| Labels | `testing`, `e2e`, `automation` |

**Description**:  
Lightweight Playwright tests that verify the critical paths without manual interaction every time.

**Acceptance Criteria**:
- [ ] Playwright installed as dev dependency in `frontend/`
- [ ] Test: Landing page loads, carousel advances, login panel renders
- [ ] Test: Dashboard page loads with correct route guard (redirect if no wallet)
- [ ] Test: Lending page renders both Supply and Borrow panels
- [ ] Test: MetaMask inject mock simulated in test environment
- [ ] `npm run test:e2e` runs all tests and passes

**Files to Create**:
```
frontend/tests/landing.spec.ts
frontend/tests/dashboard.spec.ts
frontend/tests/lending.spec.ts
frontend/playwright.config.ts
```

---

### P3-INT-006: Deploy Frontend to Production (Vercel)
**Title**: Host Next.js App on Vercel with Production Environment Variables

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 3 |
| Dependencies | P3-INT-004 |
| Labels | `devops`, `deployment`, `frontend` |

**Description**:  
Push the Next.js app to a publicly accessible URL using Vercel.

**Acceptance Criteria**:
- [ ] GitHub repository connected to Vercel project
- [ ] All `NEXT_PUBLIC_*` environment variables set in Vercel dashboard
- [ ] Production build succeeds (`next build` with zero errors or warnings)
- [ ] HTTPS enforced via Vercel default domain
- [ ] Preview deployments enabled for every PR (for code review)
- [ ] Production URL documented in README

---

### P3-INT-007: Write Walkthrough Documentation
**Title**: Create End-to-End Walkthrough Doc with Architecture Summary

| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Estimated Hours | 4 |
| Dependencies | P3-INT-006 |
| Labels | `docs`, `portfolio` |

**Description**:  
A narrative walkthrough document that tells the story of the codebase for reviewers, hiring managers, and contributors.

**Acceptance Criteria**:
- [ ] `docs/WALKTHROUGH.md` created
- [ ] Covers: what was built, why each technology was chosen, challenges faced
- [ ] Architecture diagram (Mermaid.js) embedded
- [ ] Links to Vercel URL and Etherscan contract pages
- [ ] "How to run locally" section verified step-by-step

**Files to Create**:
```
docs/WALKTHROUGH.md
```

---

## Phase 3 Full Completion Checklist

| Task ID | Title | Priority | Hours | Status |
|---------|-------|----------|-------|--------|
| P3-INT-001 | Sepolia Contract Deployment | P0 | 4 | ⬜ |
| P3-INT-002 | Etherscan Verification | P1 | 2 | ⬜ |
| P3-INT-003 | Oracle Feed Config | P1 | 2 | ⬜ |
| P3-INT-004 | Frontend ↔ Contract Testing | P0 | 8 | ⬜ |
| P3-INT-005 | Smoke Tests (Playwright) | P1 | 6 | ⬜ |
| P3-INT-006 | Vercel Deployment | P1 | 3 | ⬜ |
| P3-INT-007 | Walkthrough Documentation | P2 | 4 | ⬜ |
| **Total** | | | **29 hrs** | |

---

## Success Criteria (Phase Gate)

- [ ] All 7 contracts verified green on Sepolia Etherscan
- [ ] Production Vercel URL responds with `200 OK`
- [ ] Full Deposit → Borrow → Repay → Withdraw flow completed on Sepolia
- [ ] Zero critical console errors in production environment
- [ ] Playwright E2E test suite passes in CI
- [ ] `docs/WALKTHROUGH.md` exists and is complete
