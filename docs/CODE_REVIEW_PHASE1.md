# Phase 1: Smart Contract Development — Code Review & Kanban Tasks

> **Timeline**: Weeks 2–5  
> **Priority**: Critical  
> **Tech Stack**: Solidity 0.8.24, Hardhat, OpenZeppelin 5.x, Chainlink, Ethers.js v6, TypeScript

---

## Overview

All on-chain DeFi banking logic is built in this phase. Contracts are written in dependency order: token first, then vault, then lending — each building on the previous layer. Security modules and tests are deliverables for every single contract, not an afterthought.

---

## Task Breakdown — Core Contracts

---

### P1-SC-001: Implement `ALTBankToken.sol`
**Title**: Build ERC-20 Governance Token with Voting and Permit Support

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 5 |
| Dependencies | P0-INIT-002 |
| Labels | `contracts`, `erc20`, `governance` |

**Description**:  
Implement the `ALTBankToken` as the native protocol token. Used for governance voting, reward distribution, and fee discounts. Must follow ERC-20 + ERC20Votes + ERC20Permit standards.

**Acceptance Criteria**:
- [ ] Inherits `ERC20`, `ERC20Burnable`, `ERC20Permit`, `ERC20Votes`, `AccessControl`
- [ ] Fixed max supply of 100,000,000 ALT (100M tokens × 10^18)
- [ ] Genesis mint of 10M ALT to admin address at construction
- [ ] `mint(address, uint256)` gated to `MINTER_ROLE` — reverts if exceeds max supply
- [ ] Custom errors: `MaxSupplyExceeded`, `ZeroAddress`
- [ ] `_update` and `nonces` overrides correct for OZ 5.x compatibility
- [ ] Unit tests: transfer, delegation, permit signature, mint role check, max supply enforcement

**Files to Create**:
```
contracts/contracts/core/ALTBankToken.sol
test/ALTBankToken.test.ts
```

**Key Functions**:
```solidity
function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE);
function burn(uint256 amount) external;               // from ERC20Burnable
function delegate(address delegatee) external;        // from ERC20Votes
function permit(address,address,uint256,...) external; // from ERC20Permit
```

---

### P1-SC-002: Implement `ALTBankVault.sol`
**Title**: Build ERC-4626 Tokenized Deposit/Withdraw Vault

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 8 |
| Dependencies | P1-SC-001 |
| Labels | `contracts`, `vault`, `erc4626`, `defi` |

**Description**:  
The core banking primitive. Users deposit ERC-20 assets (e.g., USDC/WETH) and receive `vALT` vault shares that appreciate as the protocol earns yield. Must demonstrate security hardening and standard compliance.

**Acceptance Criteria**:
- [ ] Implements ERC-4626 standard (`deposit`, `mint`, `withdraw`, `redeem`, `previewDeposit`, `previewWithdraw`, `totalAssets`, `convertToShares`, `convertToAssets`)
- [ ] `deposit` and `mint` blocked by `whenNotPaused`; `withdraw`/`redeem` never blocked
- [ ] Dead shares minted to `address(0xdead)` at construction (anti-inflation-attack)
- [ ] `emergencyWithdraw(uint256 shares)` available even when paused — charges 1% penalty to `treasury`
- [ ] `depositYield(uint256 amount)` — OPERATOR_ROLE increases `totalAssets` without minting shares
- [ ] `ReentrancyGuard` on all external state-mutating functions
- [ ] Events: `YieldDeposited`, `EmergencyWithdrawal`, `TreasuryUpdated`
- [ ] Unit tests: deposit/withdraw share accounting, panic withdrawal with penalty, yield deposit increases share price, inflation attack blocked

**Files to Create**:
```
contracts/contracts/core/ALTBankVault.sol
contracts/contracts/interfaces/IVault.sol
test/ALTBankVault.test.ts
```

---

### P1-SC-003: Implement `InterestRateModel.sol`
**Title**: Design Kinked Two-Slope Dynamic Interest Rate Curve

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 5 |
| Dependencies | P0-INIT-002 |
| Labels | `contracts`, `math`, `defi` |

**Description**:  
Defines the borrow and supply APYs as a function of utilization rate. Uses a kinked two-slope model (identical to Aave/Compound architecture) to incentivize optimal utilization around 80%.

**Acceptance Criteria**:
- [ ] Constructor accepts `baseRatePerYear`, `slopePerYear1`, `slopePerYear2`, `optimalUtilization` — all converted to per-second rates at construction (`immutable`)
- [ ] `getBorrowRate(totalSupply, totalBorrows)` — returns rate per second using kinked model
- [ ] `getSupplyRate(totalSupply, totalBorrows, protocolFeeBps)` — returns supply APY net of protocol fee
- [ ] Zero division protected when `totalSupply == 0`
- [ ] Rate correct below optimal (base + slope1×util) and above optimal (base + slope1 + slope2×excess)
- [ ] Implements `IInterestRateModel` interface
- [ ] Unit tests: zero utilization, 50% utilization, 80% (kink), 100% utilization, boundary conditions

**Files to Create**:
```
contracts/contracts/core/InterestRateModel.sol
contracts/contracts/interfaces/IInterestRateModel.sol
test/InterestRateModel.test.ts
```

---

### P1-SC-004: Implement `PriceOracle.sol`
**Title**: Integrate Chainlink Price Feeds with Staleness & Sanity Protection

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 4 |
| Dependencies | P0-INIT-002 |
| Labels | `contracts`, `oracle`, `security` |

**Description**:  
A secure wrapper around Chainlink `AggregatorV3Interface` that provides USD prices per asset. Critical for collateral valuation in the LendingPool.

**Acceptance Criteria**:
- [ ] `getPrice(address asset)` returns latest Chainlink price (8 decimals)
- [ ] Staleness check: reverts with `StalePrice` if `block.timestamp - updatedAt > 1 hours`
- [ ] Sanity check: reverts with `InvalidPrice` if `price <= 0`
- [ ] `setFeed(address asset, address aggregator)` — `ORACLE_ADMIN` only
- [ ] `deactivateFeed(address asset)` — `ORACLE_ADMIN` only
- [ ] `isFeedActive(address asset)` — public view
- [ ] Implements `IPriceOracle` interface
- [ ] Unit tests: active feed returns price, stale price reverts, negative price reverts, inactive feed reverts

**Files to Create**:
```
contracts/contracts/core/PriceOracle.sol
contracts/contracts/interfaces/IPriceOracle.sol
test/PriceOracle.test.ts
```

---

### P1-SC-005: Implement `LendingPool.sol`
**Title**: Build Collateralized Lending, Borrowing, and Liquidation Engine

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 18 |
| Dependencies | P1-SC-002, P1-SC-003, P1-SC-004 |
| Labels | `contracts`, `lending`, `defi`, `security` |

**Description**:  
The most complex contract in the protocol. Handles all supply/borrow capital flow with real-time interest accrual, health factor enforcement, and the liquidation mechanism that keeps the protocol solvent.

**Acceptance Criteria**:
- [ ] `supply(address asset, uint256 amount)` — adds to user's supply balance, pulls ERC-20 from caller
- [ ] `withdraw(address asset, uint256 amount)` — reduces supply balance, sends ERC-20 back
- [ ] `borrow(address asset, uint256 amount)` — creates debt, checked by `getHealthFactor >= 1`
- [ ] `repay(address asset, uint256 amount)` — reduces debt including accrued interest
- [ ] `liquidate(address borrower, address debtAsset, address collateralAsset, uint256 debtAmount)` — seizes `1.05×` collateral value in exchange for repaying debt
- [ ] `accrueInterest(address asset)` — called internally before every mutation; updates `borrowIndex` and `totalBorrows`
- [ ] `getHealthFactor(address user)` — returns WAD-scaled ratio; < 1e18 means liquidatable
- [ ] `setCollateralFactor(address asset, uint256 factor)` — ADMIN_ROLE only
- [ ] `whenNotPaused` on `supply` and `borrow`; `withdraw` and `repay` never blocked
- [ ] `ReentrancyGuard` on all external state-mutating functions
- [ ] Implements `ILendingPool` interface
- [ ] Unit tests: supply/withdraw accounting, borrow reverts when undercollateralized, liquidation happy path, liquidation reverts when HF≥1, interest accrual over time intervals, multi-asset health factor

**Files to Create**:
```
contracts/contracts/core/LendingPool.sol
contracts/contracts/interfaces/ILendingPool.sol
test/LendingPool.test.ts
```

**Key Functions**:
```solidity
function supply(address asset, uint256 amount) external;
function withdraw(address asset, uint256 amount) external;
function borrow(address asset, uint256 amount) external;
function repay(address asset, uint256 amount) external;
function liquidate(address borrower, address debtAsset, address collateralAsset, uint256 debtAmount) external;
function getHealthFactor(address user) public view returns (uint256);
function accrueInterest(address asset) public;
```

---

### P1-SC-006: Implement `Governance.sol`
**Title**: Deploy On-Chain DAO Voting and Proposal Lifecycle

| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Estimated Hours | 6 |
| Dependencies | P1-SC-001 |
| Labels | `contracts`, `governance`, `dao` |

**Description**:  
On-chain governance using OpenZeppelin Governor pattern. ALT token holders propose and vote on protocol parameter changes. A `TimelockController` adds a 48-hour execution delay.

**Acceptance Criteria**:
- [ ] `ALTBankGovernance` extends `Governor`, `GovernorSettings`, `GovernorCountingSimple`, `GovernorVotes`, `GovernorVotesQuorumFraction`, `GovernorTimelockControl`
- [ ] Voting delay: 1 block
- [ ] Voting period: ~50,400 blocks (~7 days at 12s blocks)
- [ ] Proposal threshold: 100,000 ALT
- [ ] Quorum: 5% of total supply
- [ ] `TimelockController` executes with 48-hour min delay
- [ ] `PROPOSER_ROLE` and `EXECUTOR_ROLE` set on timelock at deploy
- [ ] Unit tests: create proposal, cast vote, proposal passes quorum, execute on timelock

**Files to Create**:
```
contracts/contracts/core/Governance.sol
test/Governance.test.ts
```

---

## Task Breakdown — Security Modules

---

### P1-SC-007: Implement `EmergencyStop.sol`
**Title**: Build Protocol-Wide Circuit Breaker (Pause Mechanism)

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 3 |
| Dependencies | P0-INIT-002 |
| Labels | `contracts`, `security`, `pause` |

**Description**:  
A dedicated emergency stop contract inherited by `ALTBankVault` and `LendingPool`. Operators can pause the protocol without affecting withdrawals or repayments.

**Acceptance Criteria**:
- [ ] Extends OpenZeppelin `Pausable`
- [ ] `pause()` and `unpause()` gated to `OPERATOR_ROLE`
- [ ] `ALTBankVault.deposit/mint` and `LendingPool.supply/borrow` decorated with `whenNotPaused`
- [ ] `ALTBankVault.withdraw/redeem` and `LendingPool.withdraw/repay` are NEVER paused
- [ ] Emits custom `ProtocolPaused(string reason, uint256 timestamp)` event
- [ ] Unit test: deposit blocked when paused, withdraw succeeds when paused

**Files to Create**:
```
contracts/contracts/security/EmergencyStop.sol
```

---

### P1-SC-008: Implement `ALTAccessControl.sol`
**Title**: Centralized Role-Based Access Control Registry

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 3 |
| Dependencies | P0-INIT-002 |
| Labels | `contracts`, `security`, `access-control` |

**Description**:  
A centralized mapping of all roles used across the protocol. All contracts inherit this for consistency and reduces role definition duplication.

**Acceptance Criteria**:
- [ ] Defines `bytes32` constants: `ADMIN_ROLE`, `OPERATOR_ROLE`, `MINTER_ROLE`, `ORACLE_ADMIN`
- [ ] Extends OpenZeppelin `AccessControl`
- [ ] 2-step role transfer pattern for `ADMIN_ROLE` (offer → accept)
- [ ] Unit tests: role assignment, revocation, 2-step admin handoff

**Files to Create**:
```
contracts/contracts/security/ALTAccessControl.sol
```

---

## Task Breakdown — Utility Libraries

---

### P1-SC-009: Implement `WadMath.sol`
**Title**: 18-Decimal Fixed-Point Arithmetic Library

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 2 |
| Dependencies | P0-INIT-002 |
| Labels | `contracts`, `math`, `library` |

**Description**:  
Provides `wadMul` and `wadDiv` for precision-safe arithmetic in interest rate and health factor calculations.

**Acceptance Criteria**:
- [ ] `wadMul(uint256 a, uint256 b)` — rounded half-up
- [ ] `wadDiv(uint256 a, uint256 b)` — rounded half-up
- [ ] Division by zero protected
- [ ] Unit tests: multiplication, division, rounding edge cases

**Files to Create**:
```
contracts/contracts/libraries/WadMath.sol
test/libraries/WadMath.test.ts
```

---

## Task Breakdown — Deployment & Tests

---

### P1-SC-010: Write Deployment Scripts
**Title**: Automated Hardhat Deploy Scripts for All Contracts

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 4 |
| Dependencies | P1-SC-001 through P1-SC-008 |
| Labels | `devops`, `hardhat`, `deploy` |

**Description**:  
A single orchestrated script that deploys all contracts in the correct dependency order, configures roles, and logs addresses.

**Acceptance Criteria**:
- [ ] `deploy.ts` deploys in order: Token → IRM → Oracle → TimelockController → Vault → LendingPool → Governance
- [ ] Post-deploy: grant `MINTER_ROLE` to LendingPool, `OPERATOR_ROLE` to LendingPool on Vault
- [ ] Contract addresses written to `deployments/{network}.json`
- [ ] Deployment verified on Etherscan via `--verify` flag hook
- [ ] Script works on `localhost`, `hardhat`, and `sepolia` networks

**Files to Create**:
```
contracts/scripts/deploy.ts
contracts/scripts/configure.ts
contracts/deployments/  (directory)
```

---

### P1-SC-011: Comprehensive Test Suite
**Title**: Full Unit + Integration Test Coverage (>90%)

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 12 |
| Dependencies | All P1-SC-001 to P1-SC-009 |
| Labels | `testing`, `hardhat`, `coverage` |

**Description**:  
Write thorough tests for all contracts. Integration tests simulate a complete user journey across multiple contracts at once.

**Acceptance Criteria**:
- [ ] Per-contract test file for all 8 contracts
- [ ] `test/integration/FullProtocol.test.ts` — deposit → borrow → accrue interest → repay → withdraw
- [ ] `test/integration/EmergencyScenario.test.ts` — pause → emergency withdraw → unpause
- [ ] Edge cases: zero amounts, max supply, HF exactly 1.0, multi-asset positions
- [ ] `npx hardhat coverage` shows > 90% line coverage
- [ ] Gas report generated via `REPORT_GAS=true`

**Files to Create**:
```
test/ALTBankToken.test.ts
test/ALTBankVault.test.ts
test/InterestRateModel.test.ts
test/PriceOracle.test.ts
test/LendingPool.test.ts
test/Governance.test.ts
test/integration/FullProtocol.test.ts
test/integration/EmergencyScenario.test.ts
```

---

## Phase 1 Full Completion Checklist

| Task ID | Title | Priority | Hours | Status |
|---------|-------|----------|-------|--------|
| P1-SC-001 | `ALTBankToken.sol` | P0 | 5 | ⬜ |
| P1-SC-002 | `ALTBankVault.sol` | P0 | 8 | ⬜ |
| P1-SC-003 | `InterestRateModel.sol` | P1 | 5 | ⬜ |
| P1-SC-004 | `PriceOracle.sol` | P1 | 4 | ⬜ |
| P1-SC-005 | `LendingPool.sol` | P0 | 18 | ⬜ |
| P1-SC-006 | `Governance.sol` | P2 | 6 | ⬜ |
| P1-SC-007 | `EmergencyStop.sol` | P0 | 3 | ⬜ |
| P1-SC-008 | `ALTAccessControl.sol` | P0 | 3 | ⬜ |
| P1-SC-009 | `WadMath.sol` library | P1 | 2 | ⬜ |
| P1-SC-010 | Deployment Scripts | P1 | 4 | ⬜ |
| P1-SC-011 | Full Test Suite | P0 | 12 | ⬜ |
| **Total** | | | **70 hrs** | |

---

## Success Criteria (Phase Gate)

- [ ] `npx hardhat compile` produces zero warnings
- [ ] `npx hardhat test` — 100% pass rate
- [ ] `npx hardhat coverage` — ≥ 90% line coverage on all contracts
- [ ] Slither static analysis: zero **High** severity issues
- [ ] Gas report: all core operations within budget targets
- [ ] All contracts deploy successfully to `localhost` Hardhat node
