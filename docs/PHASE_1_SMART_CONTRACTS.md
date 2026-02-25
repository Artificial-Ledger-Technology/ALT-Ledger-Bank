# 🔐 Phase 1 — Smart Contract Development

> **ALT-Ledger-Bank** · Decentralized Banking DApp  
> Phase Goal: Design, implement, test, and optimize all Solidity smart contracts forming the on-chain banking protocol.

---

## 📋 Table of Contents

1. [Overview & Design Principles](#overview--design-principles)
2. [Contract Architecture Map](#contract-architecture-map)
3. [ALTBankToken.sol](#1-altbanktokensol)
4. [ALTBankVault.sol](#2-altbankvaulsol)
5. [InterestRateModel.sol](#3-interestratemodesol)
6. [PriceOracle.sol](#4-priceoraclesol)
7. [LendingPool.sol](#5-lendingpoolsol)
8. [Governance.sol](#6-governancesol)
9. [Security Contracts](#7-security-contracts)
10. [Interfaces & Libraries](#8-interfaces--libraries)
11. [Testing Strategy](#testing-strategy)
12. [Gas Optimization Guide](#gas-optimization-guide)
13. [Deployment Order](#deployment-order)
14. [Common Pitfalls & Mitigations](#common-pitfalls--mitigations)

---

## Overview & Design Principles

| Principle | How It's Applied |
|-----------|-----------------|
| **Minimal Trust** | No admin can steal funds; withdrawals always accessible |
| **Fail Safe** | Emergency stop pauses deposits but never blocks withdrawals |
| **Modular** | Each contract has a single responsibility |
| **Gas Conscious** | Storage packing, events over storage, batch operations |
| **Standard Compliant** | ERC-20, ERC-4626, OZ Governor — interoperable by design |

### Security Layers

```
Layer 1: AccessControl (ADMIN, OPERATOR, MINTER roles)
Layer 2: ReentrancyGuard on all state-mutating functions
Layer 3: Pausable — blocks deposits/borrows, never withdrawals
Layer 4: Oracle staleness check (max 1hr stale Chainlink data)
Layer 5: Health factor enforcement before any borrow
```

---

## Contract Architecture Map

```
contracts/
├── core/
│   ├── ALTBankToken.sol         ERC-20 + ERC20Votes + Permit
│   ├── ALTBankVault.sol         ERC-4626 Tokenized Vault
│   ├── InterestRateModel.sol    Kinked rate curve
│   ├── PriceOracle.sol          Chainlink aggregator wrapper
│   ├── LendingPool.sol          Collateralized borrow/supply/liquidate
│   └── Governance.sol           OpenZeppelin Governor + Timelock
├── security/
│   ├── EmergencyStop.sol        Pausable circuit breaker
│   └── ALTAccessControl.sol     Centralized role definitions
├── interfaces/
│   ├── IVault.sol
│   ├── ILendingPool.sol
│   ├── IPriceOracle.sol
│   └── IInterestRateModel.sol
└── libraries/
    ├── WadMath.sol              18-decimal fixed-point math
    └── HealthFactor.sol         Collateral ratio calculations
```

---

## 1. ALTBankToken.sol

**Purpose:** Native ERC-20 governance/utility token (ticker: `ALT`).  
**Standards:** ERC-20, ERC20Votes, ERC20Permit, ERC20Burnable, AccessControl  
**Max Supply:** 100,000,000 ALT (100 million)

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `ERC20Votes` | On-chain governance delegation without a separate snapshot token |
| `ERC20Permit` | Gasless approvals via EIP-712 signatures |
| Role-gated minting | Only `MINTER_ROLE` (LendingPool) can mint reward tokens |
| 10% genesis mint | Initial liquidity to admin for protocol seeding |

### Implementation Skeleton

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

contract ALTBankToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY  = 100_000_000 * 10 ** 18;

    error MaxSupplyExceeded(uint256 requested, uint256 available);
    error ZeroAddress();

    constructor(address admin) ERC20("ALT Bank Token", "ALT") ERC20Permit("ALT Bank Token") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _mint(admin, 10_000_000 * 10 ** 18); // 10% genesis mint
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > MAX_SUPPLY)
            revert MaxSupplyExceeded(amount, MAX_SUPPLY - totalSupply());
        _mint(to, amount);
    }

    // Required overrides for ERC20Votes + ERC20Permit
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Votes) { super._update(from, to, value); }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces) returns (uint256) { return super.nonces(owner); }
}
```

---

## 2. ALTBankVault.sol

**Purpose:** Core deposit/withdraw vault. Users deposit ERC-20 assets and receive appreciating vault shares.  
**Standard:** ERC-4626 Tokenized Vault  
**Share Token:** `vALT`

### Share Price Formula

```
sharePrice  = totalAssets / totalShares
sharesOut   = deposit * totalShares / totalAssets
assetsOut   = withdraw * totalAssets / totalShares
```

> [!IMPORTANT]
> **First-depositor inflation attack** is mitigated by minting 1,000 "dead shares" to `address(0xdead)` at construction time.

### Key Features

- **ERC-4626 compliant** → composable with any DeFi aggregator
- **`whenNotPaused`** on `deposit/mint` only; withdrawals always allowed
- **Emergency withdrawal** → available even when paused, applies 1% penalty to treasury
- **`depositYield()`** → operator deposits protocol earnings, increasing share price for all holders

### Implementation Skeleton

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ALTBankVault is ERC4626, ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    uint256 public constant EMERGENCY_PENALTY_BPS = 100; // 1%
    address public treasury;

    event YieldDeposited(uint256 amount, uint256 timestamp);
    event EmergencyWithdrawal(address indexed user, uint256 shares, uint256 penalty);

    constructor(IERC20 _asset, address _admin, address _treasury)
        ERC4626(_asset) ERC20("ALT Vault Share", "vALT")
    {
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _mint(address(0xdead), 1000); // Dead shares — anti-inflation-attack
    }

    function deposit(uint256 assets, address receiver)
        public override nonReentrant whenNotPaused returns (uint256)
    { return super.deposit(assets, receiver); }

    function withdraw(uint256 assets, address receiver, address owner)
        public override nonReentrant returns (uint256)
    { return super.withdraw(assets, receiver, owner); }

    function emergencyWithdraw(uint256 shares) external nonReentrant {
        uint256 assets  = convertToAssets(shares);
        uint256 penalty = (assets * EMERGENCY_PENALTY_BPS) / 10_000;
        _burn(msg.sender, shares);
        IERC20(asset()).transfer(treasury, penalty);
        IERC20(asset()).transfer(msg.sender, assets - penalty);
        emit EmergencyWithdrawal(msg.sender, shares, penalty);
    }

    function depositYield(uint256 amount) external onlyRole(OPERATOR_ROLE) {
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
        emit YieldDeposited(amount, block.timestamp);
    }

    function pause()   external onlyRole(OPERATOR_ROLE) { _pause(); }
    function unpause() external onlyRole(OPERATOR_ROLE) { _unpause(); }
}
```

---

## 3. InterestRateModel.sol

**Purpose:** Kinked two-slope dynamic interest rate curve — identical to Aave/Compound's architecture.

### The Kinked Rate Model

```
Rate
│                                         ╱ Jump Slope (above optimal)
│                              ╱──────────
│          ╱─────────  Base Slope
│──────────
└──────────────────────────────── Utilization
 0%              Optimal (80%)         100%
```

### Key Parameters (Constructor)

| Parameter | Recommended Value |
|-----------|------------------|
| `baseRatePerYear` | 2% (0.02e18) |
| `slopePerYear1` | 4% (0.04e18) |
| `slopePerYear2` | 75% (0.75e18) |
| `optimalUtilization` | 80% (0.80e18) |

### Implementation Skeleton

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract InterestRateModel {
    uint256 constant PRECISION       = 1e18;
    uint256 constant SECONDS_PER_YEAR = 365 days;

    uint256 public immutable baseRatePerSecond;
    uint256 public immutable slopePerSecond1;
    uint256 public immutable slopePerSecond2;
    uint256 public immutable optimalUtilization;

    constructor(uint256 baseY, uint256 slope1Y, uint256 slope2Y, uint256 optimal) {
        baseRatePerSecond  = baseY  / SECONDS_PER_YEAR;
        slopePerSecond1    = slope1Y / SECONDS_PER_YEAR;
        slopePerSecond2    = slope2Y / SECONDS_PER_YEAR;
        optimalUtilization = optimal;
    }

    function getBorrowRate(uint256 supply, uint256 borrows) external view returns (uint256) {
        if (supply == 0) return baseRatePerSecond;
        uint256 util = (borrows * PRECISION) / supply;
        if (util <= optimalUtilization) {
            return baseRatePerSecond + (slopePerSecond1 * util) / PRECISION;
        }
        uint256 excessUtil = util - optimalUtilization;
        uint256 excessDenom = PRECISION - optimalUtilization;
        return baseRatePerSecond + slopePerSecond1 + (slopePerSecond2 * excessUtil) / excessDenom;
    }
}
```

---

## 4. PriceOracle.sol

**Purpose:** Chainlink-based price feeds with staleness protection and admin-configurable asset mapping.

### Staleness & Sanity Checks

```solidity
// Staleness: reject prices older than 1 hour
if (block.timestamp - updatedAt > 1 hours) revert StalePrice(asset, updatedAt);

// Sanity: reject zero or negative prices
if (price <= 0) revert InvalidPrice(asset, price);
```

### Key Functions

| Function | Access | Purpose |
|----------|--------|---------|
| `getPrice(asset)` | Public view | Returns USD price (8 decimals) |
| `setFeed(asset, aggregator)` | ORACLE_ADMIN | Map asset → Chainlink feed |
| `deactivateFeed(asset)` | ORACLE_ADMIN | Disable a feed for a deprecated asset |

---

## 5. LendingPool.sol

**Purpose:** Collateralized lending and borrowing — the heart of the DeFi banking protocol.

### State Variables (Critical)

```solidity
mapping(address => uint256) public totalSupply;       // Per-asset total supplied
mapping(address => uint256) public totalBorrows;      // Per-asset total borrowed
mapping(address => mapping(address => uint256)) public userSupply;  // user → asset → amount
mapping(address => mapping(address => uint256)) public userBorrow;  // user → asset → debt
mapping(address => uint256) public collateralFactor;  // Max LTV per asset
mapping(address => uint256) public borrowIndex;       // Cumulative interest multiplier
mapping(address => uint256) public lastAccrualTime;   // Last interest accrual timestamp
```

### Health Factor Formula

```
healthFactor = Σ(supplyUSD[i] × collateralFactor[i]) / Σ(borrowUSD[j])

healthFactor < 1.0  →  account is liquidatable
```

### Liquidation Mechanic

Liquidators repay a portion of bad debt and receive **5% bonus** on seized collateral:

```
collateralSeized = debtRepaid × debtPrice / collateralPrice × 1.05
```

> [!WARNING]
> `liquidate()` is the most sensitive function. Every edge case must be tested: zero borrow, HF exactly 1.0, multiple collateral assets, full vs. partial liquidation.

### Key Function Signatures

```solidity
function supply(address asset, uint256 amount)         external nonReentrant whenNotPaused;
function withdraw(address asset, uint256 amount)       external nonReentrant;
function borrow(address asset, uint256 amount)         external nonReentrant whenNotPaused;
function repay(address asset, uint256 amount)          external nonReentrant;
function liquidate(address borrower, address debtAsset, address collateralAsset, uint256 debtAmount)
                                                       external nonReentrant;
function getHealthFactor(address user)                 public view returns (uint256);
function accrueInterest(address asset)                 public; // Called internally before every mutation
```

---

## 6. Governance.sol

**Purpose:** On-chain DAO — token holders vote on protocol parameter changes.

### Governance Parameters

| Parameter | Value |
|-----------|-------|
| Voting delay | 1 block |
| Voting period | 50,400 blocks (~7 days) |
| Proposal threshold | 100,000 ALT |
| Quorum | 5% of total supply |
| Timelock | 48 hours before execution |

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract ALTBankGovernance is
    Governor, GovernorSettings, GovernorCountingSimple,
    GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl
{
    constructor(IVotes _token, TimelockController _timelock)
        Governor("ALTBankGovernance")
        GovernorSettings(1, 50400, 100_000e18)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(5)
        GovernorTimelockControl(_timelock)
    {}
    // All required function overrides implemented...
}
```

---

## 7. Security Contracts

### EmergencyStop.sol

- Inherits `Pausable` from OpenZeppelin
- `pause()` / `unpause()` gated to `OPERATOR_ROLE`
- Blocks `deposit`, `borrow`, `supply` — **never** blocks `withdraw` or `repay`
- Emits `ProtocolPaused(reason, timestamp)` for transparency

### ALTAccessControl.sol

- Central role registry imported by all contracts
- Roles: `ADMIN_ROLE`, `OPERATOR_ROLE`, `MINTER_ROLE`, `ORACLE_ADMIN`
- 2-step role transfer with 24-hour timelock on `ADMIN_ROLE` change
- Role renounce requires 48-hour notice to prevent accidents

---

## 8. Interfaces & Libraries

### WadMath.sol (18-decimal fixed-point arithmetic)

```solidity
library WadMath {
    uint256 constant WAD = 1e18;
    function wadMul(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * b + WAD / 2) / WAD; // round half-up
    }
    function wadDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * WAD + b / 2) / b;   // round half-up
    }
}
```

### IVault.sol

```solidity
interface IVault {
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256);
    function totalAssets() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
}
```

---

## Testing Strategy

### Test Coverage Targets

| Contract | Target |
|----------|--------|
| ALTBankToken | 100% |
| ALTBankVault | > 95% |
| InterestRateModel | 100% |
| PriceOracle | > 90% |
| LendingPool | > 95% |
| Governance | > 85% |

### Critical Test Cases

**ALTBankVault:**
- ✅ Deposit mints correct shares using formula
- ✅ Withdraw returns correct assets
- ✅ Emergency withdraw when paused — succeeds with 1% penalty
- ✅ First depositor inflation attack — blocked by dead shares
- ✅ `depositYield` increases `convertToAssets` for all holders

**LendingPool:**
- ✅ Supply updates balance and emits event
- ✅ Borrow fails when health factor would drop below 1.0
- ✅ Repay reduces debt correctly with accrued interest
- ✅ Liquidate reverts when HF ≥ 1.0
- ✅ Liquidate seizes correct collateral + 5% bonus
- ✅ Interest accrues correctly over time (1hr, 1day, 1yr)

```bash
cd contracts
npx hardhat test              # Run all tests
npx hardhat coverage          # Coverage report
REPORT_GAS=true npx hardhat test  # With gas reporting
```

---

## Gas Optimization Guide

| Technique | Applied Location |
|-----------|-----------------|
| `uint128` storage packing | LendingPool balance mappings |
| `immutable` for dependency addresses | Vault, LendingPool constructors |
| `calldata` over `memory` | All external view functions |
| Events instead of storage for history | All state changes |
| `unchecked` in safe loops | Interest accrual math |
| `viaIR: true` in Hardhat config | Compiler-level optimization |
| Avoid redundant `SLOAD` by local caching | `accrueInterest()` |

### Gas Budget Targets

| Operation | Target |
|-----------|--------|
| `deposit()` | < 80,000 gas |
| `withdraw()` | < 100,000 gas |
| `borrow()` | < 120,000 gas |
| `repay()` | < 100,000 gas |
| `liquidate()` | < 200,000 gas |

---

## Deployment Order

> [!IMPORTANT]
> Strict order required — contracts depend on each other's addresses.

```
Step 1: Deploy ALTBankToken         (no deps)
Step 2: Deploy InterestRateModel    (no deps)
Step 3: Deploy PriceOracle          (admin addr)
Step 4: Deploy TimelockController   (for Governance)
Step 5: Deploy ALTBankVault         (asset, admin, treasury)
Step 6: Deploy LendingPool          (vault, oracle, IRM)
Step 7: Deploy ALTBankGovernance    (token, timelock)

Post-Deploy Configuration:
  ├── Grant MINTER_ROLE   → LendingPool on ALTBankToken
  ├── Grant OPERATOR_ROLE → LendingPool on ALTBankVault
  ├── Set price feeds on PriceOracle
  └── Set collateral factors on LendingPool
```

---

## Common Pitfalls & Mitigations

| Pitfall | Mitigation |
|---------|-----------|
| **Reentrancy** | `ReentrancyGuard` on all external state-mutating functions |
| **Integer overflow** | Solidity 0.8.x native + `WadMath` library |
| **Oracle manipulation** | Staleness check + positive price assertion |
| **First depositor attack** | Dead shares minted at vault construction |
| **Admin key compromise** | 48-hour timelock on critical role transfers |
| **Approval race condition** | ERC20Permit for gasless permit-based approvals |
| **Liquidation griefing** | 5% bonus ensures liquidation is always profitable |

---

*Phase 1 complete. Next → [Phase 2: Frontend Development](./PHASE_2_FRONTEND.md)*
