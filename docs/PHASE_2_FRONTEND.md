# 🎨 Phase 2 — Frontend Development

> **ALT-Ledger-Bank** · Decentralized Banking DApp  
> Phase Goal: Build a premium, production-ready Web3 banking UI matching the ALTBank visual design with full on-chain data integration.

---

## 📋 Table of Contents

1. [Design Reference](#design-reference)
2. [Tech Stack Decisions](#tech-stack-decisions)
3. [Folder Structure](#folder-structure)
4. [Design System](#design-system)
5. [Page Architecture](#page-architecture)
6. [Web3 Integration Architecture](#web3-integration-architecture)
7. [Component Library](#component-library)
8. [State Management](#state-management)
9. [Common Frontend Pitfalls](#common-frontend-pitfalls)

---

## Design Reference

The UI is modelled directly on the three ALTBank screenshots provided:

| Screenshot | Page | Key Elements |
|------------|------|-------------|
| Slide 1 | Landing / Login | Blue bokeh particle BG, glass login card, `Bank From Anywhere / Rule your Business` headline |
| Slide 2 | Crypto Wallet | Dark particle BG, `Crypto Wallet Blockchain` headline, `Read More` CTA |
| Slide 3 | About Section | Purple particle BG, `Artificial Ledger Technology Bank` headline |

### Visual Identity

```
Primary Background:  #0a1628  (deep navy)
Accent Cyan:         #06b6d4
Accent Blue:         #1d4ed8
Glass Surface:       rgba(255,255,255,0.05) + backdrop-blur: 12px
Border:              rgba(255,255,255,0.10)
Text Primary:        #ffffff
Text Muted:          rgba(255,255,255,0.60)
Font:                Inter (Google Fonts)
```

---

## Tech Stack Decisions

| Technology | Version | Reason |
|------------|---------|--------|
| Next.js | 14 (App Router) | Server components, file-based routing, optimal DX |
| TypeScript | 5.x | Type safety across contract ABIs and UI |
| Ethers.js | 6.x | Industry-standard library (v6 uses native `bigint`) |
| Tailwind CSS | 3.x | Utility-first for rapid UI iterations |
| Framer Motion | 11.x | Smooth page transitions and micro-animations |
| Recharts | 2.x | React-native charting for yield/TVL visualizations |
| @tanstack/react-query | 5.x | Async state management and caching for contract calls |
| react-hot-toast | 2.x | Non-blocking transaction notifications |

> [!NOTE]
> We use **Ethers.js v6** exclusively. Key v6 differences from v5:
> - `new ethers.BrowserProvider(window.ethereum)` (was `ethers.providers.Web3Provider`)
> - `BigNumber` replaced by native `bigint`
> - `signer.getAddress()` returns `Promise<string>`

---

## Folder Structure

```
frontend/src/
├── app/                              Next.js App Router pages
│   ├── globals.css                   Design system & CSS custom properties
│   ├── layout.tsx                    Root layout (Navbar, Web3Provider)
│   ├── page.tsx                      / — Landing + Hero + Login
│   ├── dashboard/page.tsx            /dashboard — Portfolio overview
│   ├── wallet/page.tsx               /wallet — Token balances + send/receive
│   ├── exchange/page.tsx             /exchange — Token swap
│   ├── lending/page.tsx              /lending — Supply / Borrow
│   └── explore/page.tsx              /explore — Protocol stats + Governance
│
├── components/
│   ├── ParticleBackground.tsx        Full-viewport animated canvas
│   ├── Navbar.tsx                    Navigation bar
│   ├── Footer.tsx                    Footer
│   ├── HeroCarousel.tsx              3-slide auto-rotating hero
│   ├── LoginPanel.tsx                Glassmorphic right-side login card
│   ├── StatsCard.tsx                 KPI display card (TVL, APY etc.)
│   ├── YieldChart.tsx                Recharts area chart for yield
│   ├── TVLChart.tsx                  Protocol TVL over time
│   ├── PortfolioPie.tsx              User asset distribution
│   ├── TransactionTable.tsx          Recent transactions
│   ├── TokenBalanceCard.tsx          Per-token balance card
│   ├── Modal.tsx                     Base modal overlay
│   ├── ConfirmTxModal.tsx            Transaction confirmation dialog
│   ├── ErrorModal.tsx                Error / revert reason dialog
│   ├── WalletButton.tsx              Connect/disconnect wallet button
│   ├── wallet/
│   │   ├── SendModal.tsx             ERC-20 send interface
│   │   └── ReceivePanel.tsx          Address display + QR
│   ├── lending/
│   │   ├── SupplyPanel.tsx           Supply/withdraw interface
│   │   ├── BorrowPanel.tsx           Borrow/repay interface
│   │   └── HealthFactor.tsx          Health factor gauge
│   ├── exchange/
│   │   └── SwapPanel.tsx             Token swap UI
│   └── governance/
│       └── ProposalCard.tsx          Governance proposal display
│
├── hooks/
│   ├── useWallet.ts                  Connect/account/chainId
│   ├── useContract.ts                Typed ethers.Contract factory
│   ├── useVault.ts                   Vault deposit/withdraw hooks
│   ├── useLending.ts                 Supply/borrow/health factor hooks
│   ├── useGovernance.ts              Proposal/vote hooks
│   └── useTransaction.ts            TX submit/pending/confirmed lifecycle
│
├── providers/
│   ├── Web3Provider.tsx              Ethers BrowserProvider context
│   └── ThemeProvider.tsx             Dark/light mode context
│
├── services/
│   ├── abis/                         JSON ABIs from Hardhat artifacts
│   │   ├── ALTBankToken.json
│   │   ├── ALTBankVault.json
│   │   ├── LendingPool.json
│   │   └── ALTBankGovernance.json
│   ├── contracts.ts                  Address registry + typed instances
│   └── config.ts                     Chain IDs, RPC endpoints
│
├── types/
│   └── web3.ts                       Shared TypeScript types
│
└── utils/
    ├── format.ts                     Number/address formatting helpers
    └── txErrors.ts                   Solidity revert reason parser
```

---

## Design System

### Particle Background

The animated bokeh particle canvas is the visual signature of the project. Implementation requirements:

```typescript
// ParticleBackground.tsx
interface Particle {
  x: number; y: number;
  radius: number;      // 3–20px
  opacity: number;     // 0.1–0.6
  vx: number; vy: number;
  color: string;       // from palette: cyan, blue, violet, white
  blurRadius: number;  // 0–8px individual particle blur
}

// Canvas must:
// 1. Use requestAnimationFrame (not setInterval)
// 2. Re-initialize on window resize
// 3. Position fixed z-index: -1 behind all content
// 4. Apply CSS filter: blur(1px) to the entire canvas for soft bokeh look
```

### Glassmorphism Cards

```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 1rem;
}
```

### Gradient Buttons

```css
.btn-gradient {
  background: linear-gradient(135deg, #06b6d4, #1d4ed8);
  color: white;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  transition: filter 200ms, box-shadow 200ms;
}
.btn-gradient:hover {
  filter: brightness(1.15);
  box-shadow: 0 0 24px rgba(6, 182, 212, 0.4);
}
```

---

## Page Architecture

### Landing Page (`/`)

Two-column layout:
- **Left**: Auto-rotating hero carousel with 3 slides
- **Right**: Glassmorphic login panel (Username, Password, Remember Me, Login, Forgot Password, Register)

The 3 slides replicate the exact content from the project screenshots:
1. Blue bokeh background + "Bank From Anywhere / Rule your Business"
2. Dark deep navy BG + "Crypto Wallet Blockchain"
3. Purple particle BG + "Artificial Ledger Technology Bank"

### Dashboard (`/dashboard`)

Grid layout:
```
[Stats Row: TVL | Net APY | Total Borrows | Health Factor]
[TVL Area Chart (full width)                              ]
[Portfolio Pie    ]  [Quick Actions: Deposit/Borrow/Repay ]
[Recent Transactions Table (full width)                   ]
```

### Lending (`/lending`)

Two-panel split:
- **Left panel**: "Supply Markets" — list of assets with supply APY and user's supplied amount
- **Right panel**: "Borrow Markets" — list of assets with borrow APY and user's debt

Health Factor gauge floats at the top, color-coded green/yellow/red.

---

## Web3 Integration Architecture

### Connection Flow

```
1. User clicks "Connect Wallet" button
2. Web3Provider calls window.ethereum.request({ method: 'eth_requestAccounts' })
3. BrowserProvider created: new ethers.BrowserProvider(window.ethereum)
4. Signer obtained: provider.getSigner()
5. Account, chainId, balance stored in React Context
6. Network check: if chainId !== 11155111, prompt NetworkModal(switchChain)
```

### Contract Hook Pattern

All contract hooks follow this pattern for consistency:

```typescript
// Example: useVault.ts
export function useVaultDeposit() {
  const { signer } = useWallet();
  const vault = useContract(VAULT_ABI, VAULT_ADDRESS);

  const deposit = useMutation({
    mutationFn: async ({ amount }: { amount: bigint }) => {
      const tx = await vault.deposit(amount, await signer.getAddress());
      return tx.wait();
    },
    onSuccess: () => toast.success("Deposit confirmed!"),
    onError: (err) => toast.error(parseRevertReason(err)),
  });

  return deposit;
}
```

### ERC-20 Approval Pattern

Before `deposit` or `supply` operations, the user must approve the contract to spend their tokens:

```typescript
async function approveAndDeposit(tokenAddress: string, spender: string, amount: bigint) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const allowance = await token.allowance(account, spender);
  
  if (allowance < amount) {
    const approveTx = await token.approve(spender, ethers.MaxUint256);
    await approveTx.wait();
    toast.success("Token approved!");
  }
  
  // Now deposit
  await vaultContract.deposit(amount, account);
}
```

---

## Component Library

### StatsCard

```typescript
interface StatsCardProps {
  title: string;
  value: string;         // formatted: "$1,234,567.89" or "12.34%"
  change?: string;       // "+5.2% (24h)" in green or red
  icon: React.ReactNode;
  loading?: boolean;     // shows skeleton
}
```

### TransactionTable

```typescript
interface Transaction {
  hash: string;
  type: "Deposit" | "Withdraw" | "Borrow" | "Repay";
  asset: string;
  amount: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}
```

### HealthFactor Gauge

The health factor component displays:
- **Value**: Formatted to 2 decimal places
- **Color**: `text-green-400` (>1.5), `text-yellow-400` (1.0–1.5), `text-red-500` (<1.0)
- **Warning banner** when < 1.1: "Liquidation Risk — Add Collateral"

---

## State Management

| Data Type | Solution |
|-----------|----------|
| Wallet state (account, chain, balance) | React Context (`Web3Provider`) |
| On-chain read data (balances, rates) | `@tanstack/react-query` with 15s refetch |
| Transaction mutations | `useMutation` from react-query |
| UI state (modals, form inputs) | Local `useState` |
| Theme preference | `localStorage` + CSS class on `<html>` |

> [!TIP]
> Use `queryClient.invalidateQueries` after a successful transaction to trigger immediate refetch of affected balances.

---

## Common Frontend Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| **SSR window access** | Wrap all `window.ethereum` in `typeof window !== "undefined"` guard |
| **BigInt serialization** | Never pass `bigint` to `JSON.stringify` — convert to string first |
| **Ethers v5 vs v6 API** | Check every function: `getBalance` → `provider.getBalance`, BigNumber → `bigint` |
| **Missing approval step** | Always check `allowance` before state-mutating contract calls |
| **Race conditions** | Use react-query mutations — they queue automatically |
| **Hydration mismatch** | Any wallet state read during SSR must use `useEffect` / `useState(null)` |
| **Gas estimation failure** | Call `estimateGas` before `send` and show human-readable error if it reverts |

---

*Phase 2 complete. Next → [Phase 3: Integration & Deployment](./PHASE_3_INTEGRATION.md)*
