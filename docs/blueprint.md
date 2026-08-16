# Smart Stock — Pharmacy Management

Single-store retail pharmacy management app for Bangladesh, built for commercial rollout.

## Core Features

- **Sell (POS):** fast keyboard-driven billing with fuzzy medicine search, generic-substitution suggestions, and printable sale memos.
- **Medicines / Stocks:** catalog with generic group, manufacturer, expiry, shelf location, weighted-average cost, and MRP.
- **Purchase (GRN):** company invoice entry with VAT/discount capitalization into landed cost, auto stock merge, and payables.
- **Expiry Alerts:** 30/60/90-day expiry board with export.
- **Stock Warnings:** out-of-stock and low-stock monitoring.
- **Customers & Dues:** receivable ledger with proportional profit recognition on collection.
- **Payables (Suppliers):** supplier dues and payment history.
- **Expenses / Transfers:** cash and bank money management.
- **Reports:** daily and monthly profit/loss, cash flow, PDF/XLSX export.
- **Business Overview:** capital and security-deposit bookkeeping.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/Radix UI · Firebase Auth + Firestore.

## Roadmap

Phase 2 introduces batch-level stock (batch number, expiry per batch, FEFO deduction) and strip/box units. See `docs/audit-commercialization-report.md` for the full plan.
