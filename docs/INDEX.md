# 📚 ALT-Ledger-Bank — Documentation Index

> **Project**: Decentralized Banking DApp · Solidity + Next.js 14  
> **Status**: Active Development  
> Last Updated: 2026-02-25

---

## 🛠️ Phase Implementation Specs
*Deep technical blueprints: math formulas, Solidity patterns, architecture diagrams, pitfall guides.*

| Phase | File | Contents |
|-------|------|----------|
| Phase 0 | [PHASE_0_PROJECT_INITIALIZATION.md](./PHASE_0_PROJECT_INITIALIZATION.md) | Monorepo setup, Hardhat config, Next.js init, env templates, tooling |
| Phase 1 | [PHASE_1_SMART_CONTRACTS.md](./PHASE_1_SMART_CONTRACTS.md) | All 8 Solidity contracts, security model, testing strategy, gas optimization |
| Phase 2 | [PHASE_2_FRONTEND.md](./PHASE_2_FRONTEND.md) | Design system, page architecture, Web3 integration, component library |
| Phase 3 | [PHASE_3_INTEGRATION.md](./PHASE_3_INTEGRATION.md) | Sepolia deploy, Etherscan verify, oracle config, E2E tests, Vercel deploy |
| Phase 4 | [PHASE_4_POLISH.md](./PHASE_4_POLISH.md) | Data viz, dark/light theme, README overhaul, CI/CD, A11y audit |

---

## 📋 Code Review & Kanban Tasks
*GitHub Kanban-ready issue breakdowns — each task has Priority, Estimated Hours, Dependencies, Acceptance Criteria, and File Targets.*

| Phase | File | Tasks | Total Hours |
|-------|------|-------|-------------|
| Phase 0 | [CODE_REVIEW_PHASE0.md](./CODE_REVIEW_PHASE0.md) | P0-INIT-001 → P0-INIT-005 | 8 hrs |
| Phase 1 | [CODE_REVIEW_PHASE1.md](./CODE_REVIEW_PHASE1.md) | P1-SC-001 → P1-SC-011 | 70 hrs |
| Phase 2 | [CODE_REVIEW_PHASE2.md](./CODE_REVIEW_PHASE2.md) | P2-FE-001 → P2-FE-015 | 94 hrs |
| Phase 3 | [CODE_REVIEW_PHASE3.md](./CODE_REVIEW_PHASE3.md) | P3-INT-001 → P3-INT-007 | 29 hrs |
| Phase 4 | [CODE_REVIEW_PHASE4.md](./CODE_REVIEW_PHASE4.md) | P4-POL-001 → P4-POL-006 | 27 hrs |
| **TOTAL** | | **44 tasks** | **228 hrs** |

---

## 🔍 References

| File | Purpose |
|------|---------|
| [CODE_REVIEW_PHASE1_SAMPLE_ONLY.md](./CODE_REVIEW_PHASE1_SAMPLE_ONLY.md) | Original sample format reference |

---

## 🗺️ GitHub Kanban Board Setup Guide

To import these tasks as GitHub Issues:

1. Create a GitHub Project (Kanban) with columns: `Backlog → In Progress → In Review → Done`
2. Use the **GitHub CLI** to bulk-create issues from each `CODE_REVIEW_PHASE*.md`:
   ```bash
   # Example: create issue for P1-SC-001
   gh issue create \
     --title "P1-SC-001: Implement ALTBankToken.sol" \
     --body "$(cat docs/CODE_REVIEW_PHASE1.md | sed -n '/P1-SC-001/,/---/p')" \
     --label "contracts,erc20,governance" \
     --milestone "Phase 1"
   ```
3. Assign milestones: Phase 0, Phase 1, Phase 2, Phase 3, Phase 4
4. Priority labels: `P0-critical`, `P1-high`, `P2-medium`
