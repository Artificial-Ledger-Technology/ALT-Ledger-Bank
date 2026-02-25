# Phase 4: Polish & Job-Market Differentiation — Code Review & Kanban Tasks

> **Timeline**: Week 12  
> **Priority**: Medium (highest career ROI per hour of any phase)  
> **Tech Stack**: Recharts, Framer Motion, SVG, Playwright, GitHub Actions

---

## Overview

Final refinements that elevate the project from "functional" to "showcase-ready." This phase targets the first 10 seconds of someone's review — hiring managers, open-source contributors, and technical interviewers will immediately recognize this as a production-quality project.

---

## Task Breakdown

---

### P4-POL-001: Animated Data Visualizations — TVL Chart & Yield Curves
**Title**: Add Dynamic On-Chain Data Charts to Dashboard and Lending Pages

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 8 |
| Dependencies | P2-FE-005, P3-INT-004 |
| Labels | `frontend`, `charts`, `animation`, `ui` |

**Description**:  
Enhance the Dashboard and Lending pages with animated charting that visualizes the protocol's health and user performance over time.

**Acceptance Criteria**:
- [ ] TVL Area Chart: total protocol value locked over time — animated mount with Recharts `animationDuration: 1500`
- [ ] Yield Curve Line Chart: current borrow rate vs. utilization plotted across 0–100% utilization — shows the kinked shape from the smart contract model
- [ ] User Portfolio Pie Chart: breakdown of user's supplied assets by token type
- [ ] All charts use cyan-blue gradient fill matching the app theme
- [ ] Charts are responsive — reflow at 768px breakpoint
- [ ] Loading skeleton displayed while data loads

**Files Modified**:
```
frontend/src/components/YieldChart.tsx    (enhanced)
frontend/src/components/TVLChart.tsx      (new)
frontend/src/components/PortfolioPie.tsx  (new)
frontend/src/app/dashboard/page.tsx       (integrate new charts)
```

---

### P4-POL-002: Dark / Light Theme Toggle
**Title**: Implement Accessible Dark and Light Mode Switcher

| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Estimated Hours | 4 |
| Dependencies | P2-FE-002 |
| Labels | `frontend`, `ux`, `a11y`, `theme` |

**Description**:  
Allow users to switch between the signature dark ALTBank theme and a lighter alternative — a modern UX expectation.

**Acceptance Criteria**:
- [ ] Toggle button in Navbar with sun/moon icon
- [ ] Theme preference persisted to `localStorage`
- [ ] System preference `prefers-color-scheme` respected on first load
- [ ] CSS variables swapped without page flash (avoids FOUC)
- [ ] All glass cards, buttons, and text remain readable in both modes
- [ ] Framer Motion animated toggle icon rotation

**Files Modified**:
```
frontend/src/app/globals.css              (light theme variables)
frontend/src/providers/ThemeProvider.tsx  (new)
frontend/src/components/Navbar.tsx        (add toggle button)
```

---

### P4-POL-003: Comprehensive README Overhaul
**Title**: Rewrite README with Architecture Diagrams, Badges, and Demo Links

| Field | Value |
|-------|-------|
| Priority | P0 - Critical |
| Estimated Hours | 4 |
| Dependencies | P3-INT-006 (Vercel URL) |
| Labels | `docs`, `portfolio`, `readme` |

**Description**:  
The README is the most-read file in the project. It must immediately communicate the project's scope, quality, and purpose to any technical reviewer.

**Acceptance Criteria**:
- [ ] Hero banner with project logo / GIF demo screenshot
- [ ] Badges: Built with Next.js, Solidity, Hardhat, Vercel Deploy Status, License
- [ ] One-paragraph "What is this?" description — 2026 DeFi angle highlighted
- [ ] Tech stack table with purpose column
- [ ] Mermaid.js architecture diagram (System Context level)
- [ ] Quick start: clone → install → compile → run in < 5 steps
- [ ] Contract addresses table (with Etherscan links)
- [ ] Features list with checkmarks
- [ ] "Contributing" section
- [ ] License badge + text

**Files Modified**:
```
README.md   (full overhaul)
```

---

### P4-POL-004: Demo Video & Portfolio Screenshots
**Title**: Record Demo GIF/Video and Capture Portfolio-Quality Screenshots

| Field | Value |
|-------|-------|
| Priority | P1 - High |
| Estimated Hours | 3 |
| Dependencies | P3-INT-006 |
| Labels | `portfolio`, `media`, `docs` |

**Description**:  
Visual proof of the working product — the most persuasive asset in a portfolio or job application.

**Acceptance Criteria**:
- [ ] 30–60 second screen recording of: wallet connect → deposit → borrow → check health factor
- [ ] GIF version of demo (optimized < 5MB) embedded in README
- [ ] 5 high-resolution screenshots: Landing Page, Dashboard, Wallet, Lending, Explore
- [ ] Screenshots stored in `assets/screenshots/` folder
- [ ] Screenshots embedded in README `## Screenshots` section

**Files to Create**:
```
assets/screenshots/01_landing.png
assets/screenshots/02_dashboard.png
assets/screenshots/03_wallet.png
assets/screenshots/04_lending.png
assets/screenshots/05_explore.png
assets/demo.gif                      (embedded in README)
```

---

### P4-POL-005: Performance & Accessibility Audit
**Title**: Final Lighthouse Optimization and WCAG Compliance Pass

| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Estimated Hours | 4 |
| Dependencies | P3-INT-006 |
| Labels | `performance`, `a11y`, `seo` |

**Description**:  
Run Lighthouse and address all Performance, Accessibility, and SEO findings before calling the project complete.

**Acceptance Criteria**:
- [ ] Lighthouse Performance score ≥ 85 on production URL
- [ ] Lighthouse Accessibility score = 100
- [ ] Lighthouse SEO score = 100
- [ ] Open Graph meta tags added: `og:title`, `og:description`, `og:image`
- [ ] `<title>` tag unique per page
- [ ] `alt` text on all images
- [ ] All interactive elements have `aria-label`
- [ ] No color contrast failures in either light or dark mode

**Files Modified**:
```
frontend/src/app/layout.tsx   (OG meta tags)
frontend/src/app/**/page.tsx  (unique titles)
```

---

### P4-POL-006: CI/CD Pipeline with GitHub Actions
**Title**: Automated Lint, Test, and Build Pipeline on Every PR

| Field | Value |
|-------|-------|
| Priority | P2 - Medium |
| Estimated Hours | 4 |
| Dependencies | P0-INIT-004 |
| Labels | `ci-cd`, `github-actions`, `devops` |

**Description**:  
A GitHub Actions workflow that runs on every pull request to prevent regressions.

**Acceptance Criteria**:
- [ ] `.github/workflows/ci.yml` created
- [ ] Job 1: `lint` — ESLint + Prettier check
- [ ] Job 2: `contracts-test` — `npx hardhat compile && npx hardhat test`
- [ ] Job 3: `frontend-build` — `npm run build` in `frontend/`
- [ ] All 3 jobs pass before PRs can merge (branch protection rule)
- [ ] Vercel preview deployments triggered automatically on PR

**Files to Create**:
```
.github/workflows/ci.yml
```

---

## Phase 4 Full Completion Checklist

| Task ID | Title | Priority | Hours | Status |
|---------|-------|----------|-------|--------|
| P4-POL-001 | Animated TVL + Yield Charts | P1 | 8 | ⬜ |
| P4-POL-002 | Dark / Light Theme Toggle | P2 | 4 | ⬜ |
| P4-POL-003 | README Overhaul | P0 | 4 | ⬜ |
| P4-POL-004 | Demo Video & Screenshots | P1 | 3 | ⬜ |
| P4-POL-005 | Performance & A11y Audit | P2 | 4 | ⬜ |
| P4-POL-006 | GitHub Actions CI/CD | P2 | 4 | ⬜ |
| **Total** | | | **27 hrs** | |

---

## Success Criteria (Project Complete)

- [ ] Lighthouse Performance ≥ 85, Accessibility = 100, SEO = 100
- [ ] GIF demo plays correctly when embedded in README on GitHub
- [ ] GitHub Actions CI passes green on `main` branch
- [ ] README immediately communicates the project's depth to a stranger
- [ ] Complete user journey completes in < 2 minutes on the live Vercel URL
- [ ] Project qualifies as a **portfolio-grade, job-market-ready** DeFi DApp
