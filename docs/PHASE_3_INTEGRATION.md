# 🚀 Phase 3 — Integration & Deployment

> **ALT-Ledger-Bank** · Decentralized Banking DApp  
> Phase Goal: Connect all contracts and the frontend in a live testnet environment, validate full user journeys, and ship to production.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Sepolia Testnet Deployment](#sepolia-testnet-deployment)
4. [Etherscan Verification](#etherscan-verification)
5. [Oracle Configuration](#oracle-configuration)
6. [Frontend ENV Wiring](#frontend-env-wiring)
7. [Integration Testing Protocol](#integration-testing-protocol)
8. [E2E Smoke Tests (Playwright)](#e2e-smoke-tests-playwright)
9. [Vercel Production Deployment](#vercel-production-deployment)
10. [Monitoring & Alerting](#monitoring--alerting)
11. [Troubleshooting](#troubleshooting)

---

## Overview

By the end of this phase:
- ✅ All 7 Solidity contracts live on **Sepolia testnet**
- ✅ All contracts **verified** on Etherscan (readable source code)
- ✅ Frontend wired to testnet contracts — every page works end-to-end
- ✅ Full user journey (deposit → borrow → repay → withdraw) validated
- ✅ Next.js app **deployed to Vercel** at a public HTTPS URL
- ✅ E2E Playwright tests pass in CI

---

## Pre-Deployment Checklist

Complete before running any deployment scripts:

```bash
# 1. All contracts compile with zero warnings
cd contracts && npx hardhat compile

# 2. All tests pass with ≥90% coverage
npx hardhat test && npx hardhat coverage

# 3. Environment variables available
cat .env | grep SEPOLIA_RPC_URL        # Must be non-empty
cat .env | grep DEPLOYER_PRIVATE_KEY   # Must be non-empty  
cat .env | grep ETHERSCAN_API_KEY      # Must be non-empty

# 4. Deployer wallet has Sepolia ETH (get from faucet)
# Recommended: ≥ 0.25 Sepolia ETH for all deployments + oracle calls
# Faucet: https://sepoliafaucet.com
```

---

## Sepolia Testnet Deployment

### Deployment Order

> [!IMPORTANT]
> Execute in this exact order every time. Each contract depends on the addresses of previous ones.

```bash
cd contracts

# Step 1: Deploy entire protocol
npx hardhat run scripts/deploy.ts --network sepolia

# The deploy.ts script executes these in order:
# 1. ALTBankToken.sol         → stores address as TOKEN
# 2. InterestRateModel.sol    → stores address as IRM
# 3. PriceOracle.sol          → stores address as ORACLE
# 4. TimelockController.sol   → stores address as TIMELOCK
# 5. ALTBankVault.sol         → (asset=TOKEN, admin, treasury) → stores as VAULT
# 6. LendingPool.sol          → (vault=VAULT, oracle=ORACLE, irm=IRM) → stores as POOL
# 7. ALTBankGovernance.sol    → (token=TOKEN, timelock=TIMELOCK) → stores as GOV
```

### Post-Deployment Configuration Script

```bash
# Step 2: Configure roles and parameters
npx hardhat run scripts/configure.ts --network sepolia

# configure.ts performs:
# - token.grantRole(MINTER_ROLE, POOL_ADDRESS)
# - vault.grantRole(OPERATOR_ROLE, POOL_ADDRESS)
# - oracle.setFeed(ETH_ADDRESS, CHAINLINK_ETH_USD_SEPOLIA)
# - lendingPool.setCollateralFactor(TOKEN_ADDRESS, 0.75e18)
```

### Address Logging

All contracts are automatically written to `contracts/deployments/sepolia.json`:

```json
{
  "ALTBankToken":      "0x...",
  "InterestRateModel": "0x...",
  "PriceOracle":       "0x...",
  "TimelockController":"0x...",
  "ALTBankVault":      "0x...",
  "LendingPool":       "0x...",
  "ALTBankGovernance": "0x..."
}
```

---

## Etherscan Verification

### Verify All Contracts

```bash
# Read addresses from deployments/sepolia.json and verify each

npx hardhat verify --network sepolia <TOKEN_ADDRESS> "<ADMIN_ADDRESS>"
npx hardhat verify --network sepolia <IRM_ADDRESS>   "20000000000000000" "40000000000000000" "750000000000000000" "800000000000000000"
npx hardhat verify --network sepolia <ORACLE_ADDRESS> "<ADMIN_ADDRESS>"
npx hardhat verify --network sepolia <VAULT_ADDRESS>  "<TOKEN_ADDRESS>" "<ADMIN_ADDRESS>" "<TREASURY_ADDRESS>"
npx hardhat verify --network sepolia <POOL_ADDRESS>   "<VAULT_ADDRESS>" "<ORACLE_ADDRESS>" "<IRM_ADDRESS>"
npx hardhat verify --network sepolia <GOV_ADDRESS>    "<TOKEN_ADDRESS>" "<TIMELOCK_ADDRESS>"
```

### Verification Success Indicators

- Green **✅ Contract Source Code Verified** badge on Etherscan
- "Read Contract" and "Write Contract" tabs accessible
- Source code visible under "Contract" tab

---

## Oracle Configuration

Chainlink Feed Addresses on **Sepolia**:

| Asset | Pair | Chainlink Address |
|-------|------|------------------|
| ETH | ETH/USD | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |
| BTC | BTC/USD | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` |
| USDC | USDC/USD | `0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E` |

```bash
# Set feeds via configure.ts or directly via Hardhat console
npx hardhat console --network sepolia

> const oracle = await ethers.getContractAt("PriceOracle", "<ORACLE_ADDRESS>")
> await oracle.setFeed("<ETH_ADDRESS>", "0x694AA1769357215DE4FAC081bf1f309aDC325306")
> const price = await oracle.getPrice("<ETH_ADDRESS>")
> console.log(ethers.formatUnits(price, 8)) // Should print ETH price e.g. "2345.12000000"
```

---

## Frontend ENV Wiring

After deployment, update `.env` and the Vercel dashboard with all contract addresses:

```dotenv
# .env (local) — paste values from deployments/sepolia.json
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ALT_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x...
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0x...
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wc_project_id
```

Restart the Next.js dev server after changing env vars:

```bash
cd frontend && npm run dev
```

---

## Integration Testing Protocol

### Manual Test Cases (All Required to Pass)

**Wallet Connection**
- [ ] Click "Connect Wallet" → MetaMask prompts connection
- [ ] After connect, truncated address (`0x1234...abcd`) appears in Navbar
- [ ] If on wrong network, "Switch to Sepolia" prompt appears
- [ ] Disconnect works and clears address from UI

**Dashboard**
- [ ] Dashboard loads within 3 seconds
- [ ] All stats cards show `0` for a fresh wallet (not loading error)
- [ ] Skeleton shown while fetching

**Deposit Flow**
- [ ] Navigate to Lending → Supply
- [ ] Enter amount, click "Supply"
- [ ] MetaMask opens for ERC-20 approval → confirm
- [ ] MetaMask opens for deposit TX → confirm
- [ ] Toast: "Transaction submitted" → "Deposit confirmed!"
- [ ] Dashboard: `Total Deposited` value increases
- [ ] Vault share balance (`vALT`) visible in Wallet page

**Borrow Flow**
- [ ] Navigate to Lending → Borrow
- [ ] Enter borrow amount below safe threshold
- [ ] Health Factor gauge updates before confirmation
- [ ] MetaMask confirms borrow TX
- [ ] Dashboard: `Outstanding Borrows` increases, Health Factor decreases

**Repay Flow**
- [ ] Click Repay on Borrow panel
- [ ] Enter repay amount
- [ ] TX confirmed, debt balance reduces
- [ ] Health Factor improves

**Withdraw Flow**
- [ ] Click Withdraw, enter share amount
- [ ] TX confirmed, asset returned to wallet
- [ ] `vALT` balance decreases, token balance increases

**Error Cases**
- [ ] Attempt borrow that would drop HF < 1.0 → contract reverts → ErrorModal shows "Insufficient collateral"
- [ ] Attempt deposit with 0 amount → UI validates before sending TX

---

## E2E Smoke Tests (Playwright)

```bash
# Install Playwright
cd frontend
npx playwright install chromium

# Run E2E tests
npm run test:e2e
```

### Test Files

```typescript
// tests/landing.spec.ts
test("landing page loads and carousel renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Bank From Anywhere");
  await page.waitForTimeout(5500); // Wait for carousel slide
  await expect(page.locator("h1")).toContainText("Crypto Wallet");
});

// tests/dashboard.spec.ts
test("unauthenticated user is redirected from dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/"); // Wallet guard redirects
});

// tests/lending.spec.ts
test("lending page renders supply and borrow panels", async ({ page }) => {
  // Inject mock provider...
  await page.goto("/lending");
  await expect(page.locator("[data-testid='supply-panel']")).toBeVisible();
  await expect(page.locator("[data-testid='borrow-panel']")).toBeVisible();
});
```

---

## Vercel Production Deployment

### Setup Steps

1. Push repo to GitHub (if not already connected)
2. Go to [vercel.com](https://vercel.com) → "Import Project" → select `ALT-Ledger-Bank`
3. Set **Root Directory** to `frontend/`
4. Add all `NEXT_PUBLIC_*` environment variables in Vercel dashboard
5. Click **Deploy**

### Build Command & Output

```
Build Command:  npm run build
Output Dir:     .next
Install Command: npm install
```

### Preview Deployments

Every PR to `main` gets a unique preview URL — useful for code review. Enable in Vercel project settings under "Git" → "Preview Deployments."

---

## Monitoring & Alerting

| Tool | Purpose |
|------|---------|
| Etherscan "Contract Alerts" | Alert on unexpected contract calls (front-running, exploits) |
| Tenderly | Real-time contract simulation and transaction tracing |
| Vercel Analytics | Frontend performance monitoring |
| UptimeRobot | Uptime check on production URL (every 5 minutes) |

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Deploy fails: "insufficient funds" | Add more Sepolia ETH to deployer wallet |
| Etherscan verify fails: "already verified" | This is fine — skip |
| Etherscan verify fails: "contract not found" | Wait 30-60s for indexing, retry |
| Frontend shows stale contract address | Restart `npm run dev` after updating `.env` |
| `getPrice()` reverts with `StalePrice` | Chainlink feed on Sepolia may be paused — check feed status at `data.chain.link` |
| MetaMask shows wrong chain | Use `wallet_switchEthereumChain` to programmatically switch to Sepolia (chainId: `0xaa36a7`) |

---

*Phase 3 complete. Next → [Phase 4: Polish & Differentiation](./PHASE_4_POLISH.md)*
