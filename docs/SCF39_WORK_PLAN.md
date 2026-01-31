# SCF #39 Milestone Work Plan

> Last Updated: 2025-12-12
> Status: In Progress

## Overview

This document tracks the work required to meet SCF #39 (Stellar Community Fund) milestone requirements for Lumen Later BNPL Protocol.

## Milestone Summary

| Tranche | Budget | Timeline | Status |
|---------|--------|----------|--------|
| Tranche 1 (MVP) | $47,600 | Sep-Oct 2025 | 🟡 In Progress |
| Tranche 2 (Testnet) | $46,350 | Oct-Dec 2025 | 🟡 Partial |
| Tranche 3 (Mainnet) | $37,600 | Dec 2025-Feb 2026 | ⏳ Pending |

## Current State

### Completed
- [x] Core Soroban contracts (bnpl_core, lp_token, usdc_token)
- [x] Testnet deployment
- [x] MVP Next.js frontend with role-based views
- [x] Wallet integration (Freighter)
- [x] Merchant enrollment flow
- [x] LP deposit/withdraw functionality
- [x] Liquidation mechanism
- [x] Basic documentation (docs/, README)
- [x] burn_from function (SEP-41 compliance)

### Testnet Contract Addresses
```
BNPL Core: CB2C6INGREV2E4V2ISA4CHSSXVVIPJCJEZXMUL5LTSAMJFNF37CBUM22
USDC Token: CAVONKCQ4KLYX3C22Q22722NVGABOVZQ6UDV6OAVJ5Q5ETHYAZN7QJC3
LP Token: CD52BXRSLRWICSTICLJKRNVT4R2EH54HGHYQIYKRCBOY35TOQ47AD2XS
```

---

## Work Items

### 0. Token Interface Fix ✅ COMPLETED
**Branch:** `fix/token-interface`
**Status:** Done

- [x] Implement `burn_from` function in usdc_token
- [x] Add unit tests for burn_from (3 tests added)
- [x] All 47 tests passing

---

### 1. Event Indexer ✅ IN PROGRESS
**Branch:** `feat/event-indexer`
**Priority:** 🔴 Critical (Tranche 1 Required)
**Estimated Effort:** 3-5 days

#### Architecture Decision: Mercury Classic
Selected **Mercury** as the indexer solution:
- Official Stellar/Soroban indexer service
- Free tier available (testnet)
- No contract modifications needed
- Simple REST API for event queries

#### Events to Index
| Contract | Event | Data |
|----------|-------|------|
| bnpl_core | BillCreated | bill_id, merchant, user, amount, order_id |
| bnpl_core | BillPaid | bill_id, user, loan_id, amount |
| bnpl_core | BillRepaid | bill_id, user, amount_repaid, interest_paid |
| bnpl_core | BillLiquidated | bill_id, liquidator, collateral_seized |
| lp_token | Deposit | provider, amount, shares_minted |
| lp_token | Withdraw | provider, amount, shares_burned |

#### Setup Required
```bash
# 1. Get API key from Mercury dashboard: https://mercurydata.app
# 2. Add to apps/web/.env:
MERCURY_API_KEY=your_api_key_here
```

#### Deliverables
- [x] Database schema for events (Prisma)
- [x] Mercury indexer service (TypeScript)
- [x] REST API endpoints (`/api/indexer/*`)
- [x] Setup documentation (`docs/EVENT_INDEXER.md`)
- [ ] Frontend integration
- [ ] Cron job for automated sync

---

### 2. Metrics Dashboard
**Branch:** `feat/metrics-dashboard`
**Priority:** 🔴 Critical (Tranche 2 Required)
**Estimated Effort:** 2-3 days

#### Requirements
- Real-time protocol metrics
- Admin dashboard integration
- CSV export functionality

#### Metrics to Track
| Metric | Source | Update Frequency |
|--------|--------|------------------|
| TVL (Total Value Locked) | LP Token contract | Real-time |
| Active Loans | BNPL Core contract | Real-time |
| Total Revenue | Fee distributions | Daily |
| Utilization Rate | Borrowed / TVL | Real-time |
| User Count | Unique addresses | Daily |
| Merchant Count | Enrolled merchants | Daily |
| Transaction Count | Event indexer | Real-time |

#### Deliverables
- [ ] Contract query service
- [ ] Metrics aggregation logic
- [ ] Admin dashboard UI update (remove TODOs)
- [ ] CSV report generation
- [ ] Health check endpoint

---

### 3. Test Coverage Setup
**Branch:** `feat/test-coverage`
**Priority:** 🟡 Important (Tranche 1 Required)
**Estimated Effort:** 1-2 days

#### Requirements
- >80% line coverage for contracts
- Automated coverage reports
- CI integration

#### Current Test Count (47 total)
- bnpl_core: 12 tests
- lp_token: 24 tests
- usdc_token: 7 tests (updated)
- integration_test: 4 tests

#### Tools
- `cargo-tarpaulin` (recommended for Soroban)
- `cargo-llvm-cov` (alternative)

#### Deliverables
- [ ] Install coverage tool
- [ ] Configure Cargo.toml
- [ ] Generate baseline report
- [ ] Add missing tests to reach >80%
- [ ] CI workflow for coverage

---

### 4. Testnet Metrics Tracking
**Branch:** `feat/testnet-metrics`
**Priority:** 🟡 Important (Tranche 2 Required)
**Estimated Effort:** 2-3 days

#### Requirements (Tranche 2 Success Criteria)
- 2+ volunteer merchants
- 20+ users
- 50+ lifecycle transactions

#### Tracking Approach
1. Query on-chain data via Horizon API
2. Aggregate unique addresses
3. Count transaction types
4. Generate progress reports

#### Deliverables
- [ ] Metrics collection script
- [ ] Progress dashboard
- [ ] Merchant onboarding documentation
- [ ] User acquisition strategy

---

## Branch Strategy

```
main
├── fix/token-interface      ✅ DONE
├── feat/event-indexer       (next)
├── feat/metrics-dashboard
├── feat/test-coverage
└── feat/testnet-metrics
```

### Workflow
1. Complete work on branch
2. Run tests: `cargo test` (contracts) / `pnpm test` (frontend)
3. Create PR to main
4. Review and merge
5. Update this document

---

## Timeline

```
Week 1: fix/token-interface ✅ + feat/event-indexer
Week 2: feat/metrics-dashboard + feat/test-coverage
Week 3: feat/testnet-metrics + documentation
Week 4: Testing, polish, Tranche 1 submission
```

---

## Success Criteria Checklist

### Tranche 1 (MVP)
- [x] Core contracts deployed and tested
- [ ] >80% test coverage documented
- [x] MVP frontend functional
- [ ] Event indexer operational
- [x] Developer documentation complete
- [ ] Demo video created

### Tranche 2 (Testnet)
- [x] Public testnet dApp
- [ ] 2+ merchants onboarded
- [ ] 20+ users registered
- [ ] 50+ transactions executed
- [ ] Monitoring dashboard live
- [ ] CSV reports generated

### Tranche 3 (Mainnet)
- [ ] Mainnet deployment
- [ ] 3+ merchants
- [ ] 30+ users
- [ ] $50K+ TVL
- [ ] 80+ transactions
- [ ] Compliance workflow documented

---

## References

- [SCF #39 Submission](https://dashboard.communityfund.stellar.org)
- [Protocol Whitepaper](docs/protocol/whitepaper.md)
- [System Architecture](docs/architecture/system-overview.md)
- [Contract Documentation](docs/contracts/)

---

## Notes for Claude

When working on this project:
1. Always check current branch with `git status`
2. Read this document for context on priorities
3. Update status as tasks complete
4. Reference Serena memories for project context
5. Run tests before committing: `cargo test`
6. Working directory is `/Users/sangwon0001/Projects/helios/tempp/lumen-later`
