# Audit & Commercialization Report
**Project:** inv_mng (Smart Stock) — Pharmacy Management App
**Audited:** 2026-08-16 · Full repository analysis, 261 TS/TSX files, ~28,300 LOC
**Context:** Single-store production app in Bangladesh, targeted for commercial sale to other pharmacies.

---

## 1. Executive Summary

**Tech stack:** Next.js 15 (App Router, Turbopack) · React 18 · TypeScript · Tailwind CSS · shadcn/Radix UI · Firebase (Auth + Firestore via client SDK inside `'use server'` actions) · react-hook-form + Zod · jsPDF/autotable · SheetJS (xlsx) · Recharts.

**Architecture:** Server Actions in `src/lib/db/` perform all Firestore reads/writes under per-tenant paths `users/{uid}/{collection}`. Client hooks (`src/hooks/`) call actions via the `src/lib/actions.ts` facade. The app began life as a **bookstore inventory tool** (`docs/blueprint.md` still titled "Bookstore Basic") and carries a 3-way `storeType` (general/pharmacy/bookstore) through every layer.

**What is genuinely strong:** transactional sale/purchase writes (`runTransaction`), weighted-average cost capitalization (VAT + discount factored into cost), due/receivable with proportional profit recognition, paginated history, solid POS keyboard grid navigation, fuzzy item search across title/company/generic, alternative-medicine substitution dialog, 30/60/90-day expiry board, per-tenant data isolation by design.

**Top 5 critical action items (personal app → commercial BD pharmacy product):**

1. **Close the server-trust hole.** Every server action accepts `userId` from the client; `src/lib/auth.ts` is a mock returning a hard-coded user; `secretKey` is stored in plaintext and never validated. Any authenticated Firebase user (or leaked credentials) can invoke actions with any `userId`. Before selling to a single additional pharmacy, derive identity server-side (session cookie via Firebase Admin) and enforce Firestore rules + action-level tenant checks.
2. **Move to batch-level stock with FEFO.** Today stock is one number on the item doc; `expiryDate` is a single field that purchases **overwrite**, and item identity during purchase matching is the string `title + expiry`. Two invoices of the same medicine with different expiries silently merge/overwrite. Professional pharmacies (and DGDA expectations) require `batch_no`, expiry per batch, FEFO deduction, and batch-wise expiry reports.
3. **Build a barcode-first POS.** There is **zero** barcode support in the codebase (no field, no scan handler). Bangladeshi retail pharmacy speed depends on EAN scan → line item → tender. Also missing: function-key shortcuts, an 80 mm thermal quick-print flow, held bills, and reprint of last memo.
4. **Strip the bookstore/general-store bloat.** `storeType` branching, `author` book fields, office-asset dialogs, donation counters, unused Genkit AI dependencies (~large install weight), and orphan components (`transactions-management.tsx` is imported by nothing) all add surface area, bugs, and support cost.
5. **Add BD pharmacy professional features.** Mushak 6.3 VAT-compliant invoices (BIN, VAT line, chalan), supplier as a first-class entity with ledger and **purchase returns** (completely absent), strip/box/tablet unit conversion, drug schedule flags + narcotics register, MRP handling, Bangla UI toggle, offline/degraded sale mode, and day-close (Z) reporting.

---

## 2. Codebase & Architecture Inventory

### 2.1 Folder structure

```
src/
├── app/
│   ├── (main)/              # 15 authenticated pages
│   │   ├── dashboard/ sales/ items/ purchases/ customers/
│   │   ├── expenses/ payables/ reports/ sales-returns/
│   │   ├── expiry-alerts/ stock-warnings/ balance-sheet/
│   │   ├── transfer/ bulk-shelf-update/
│   │   └── layout.tsx       # sidebar shell
│   ├── login/  onboarding/  auth-wrapper.tsx
├── components/              # ~90 feature components + full shadcn ui/ kit
│   ├── sales/ purchases/ items/ customers/ expenses/ payables/
│   ├── balance-sheet/ office-assets/ sales-return/ stock-warnings/
│   ├── reports/ transactions/ transfer/ expiry/ onboarding/ layout/
│   └── ui/                  # shadcn primitives (sidebar 771 LOC is stock)
├── hooks/                   # 27 client data hooks (one per screen concern)
├── lib/
│   ├── db/                  # 26 'use server' modules — the entire backend
│   ├── firebase.ts          # client SDK init from NEXT_PUBLIC_* env
│   ├── auth.ts              # MOCK getAuthUser() — dead/placeholder
│   ├── types.ts             # domain model (230 LOC)
│   ├── search-utils.ts      # fuzzy matcher
│   └── report-generator.ts  # pure monthly-report calculator
├── scripts/                 # EMPTY
└── docs/blueprint.md        # stale bookstore blueprint
```

### 2.2 Pattern & evaluation

- **Pattern:** Server-Action-as-repository. Each domain has a facade (`sales.ts`) re-exporting queries (`sales-queries.ts`) and mutations (`sales-actions.ts`). Client pages mount a hook that loads everything client-side; there is no RSC data fetching despite App Router.
- **State:** No global store. Each page hook re-fetches `getItems`/`getCustomers` independently — the sidebar (`app-sidebar.tsx:43-65`) refetches the **entire items collection on every route change** to compute badge counts. This is both a latency and a Firestore-read-cost problem that scales linearly with tenants.
- **Concurrency:** Mutations correctly use `runTransaction` (sale, purchase, return, payment). However `deleteSale` (`sales-actions.ts:252-253`) and `updatePurchase` (`purchase-update.ts:39-49`) run `getDocs` **outside/alongside** the transaction and match related docs by `description.includes(purchaseId)` — reads are not locked, and string-contains matching is fragile (see §4.4).
- **Batch limits:** `resetDatabase` (`database.ts:134-140`) deletes all collections in a **single** `writeBatch` — Firestore caps batches at 500 ops; a real store's data will exceed this and the reset will throw midway.
- **Multi-user readiness:** *Not ready.* (a) No server-side identity (§7.2); (b) no roles — whoever owns the Google account is god; (c) Firestore security rules are not in the repo (must be verified/deployed via console); (d) no audit trail for destructive ops (delete/edit sale leave no trace).
- **Coupling:** Domain logic is reasonably separated (good), but the `assets`/`surgicals` special-case (lowercased category-name string checks) is copy-pasted across at least 6 files (`items.ts:36`, `items.ts:77`, `items.ts:100`, `items.ts:113`, `sales-actions.ts:44`, `sales-actions.ts:337`, `purchase-create.ts:88`, `purchase-create.ts:111`, `sidebar`, `record-sale-form.tsx:123`) — a classic missing-enum/missing-flag smell.

---

## 3. Domain Model & Database Schema Deep Dive (Optimization)

### 3.1 Current model (`src/lib/types.ts`)

| Collection | Key fields | Pharmacy gaps |
|---|---|---|
| `items` | `title, categoryId/Name, author?, medicineGroup?, company?, expiryDate? (single), location?, productionPrice (WAC), sellingPrice, stock, ignoredWarning` | no barcode, no batch_no, no MRP, no pack/strip units, no strength, no drug schedule, no reorder level, no VAT rate |
| `sales` | `saleId SALE-0001, items[{itemId, qty, price}], subtotal, discount, total, paymentMethod, amountPaid, creditApplied` | line has **no costAtSale** (profit recomputed from *current* WAC later), no batch reference, no VAT breakdown, no dispenser/salesperson |
| `purchases` | `PUR-0001, supplier (free text), items[{itemName (string!), category, expiry?, cost, sellingPrice?}], vat fields, dueDate` | items linked by **name string**, no supplier entity, no batch_no, no MRP, no unit (box/strip), no invoice no from distributor |
| `customers` | `name, phone, whatsapp, address, openingBalance, dueBalance` | no credit limit, no customer type (wholesale/retail/doctor), no BIN for institutional buyers |
| `transactions` | receivable/payable, `saleId`, profit-split fields | payables not tied to a supplier entity; description-string linkage only |

### 3.2 Specific changes needed (professional pharmacy standard)

**Additive — no breakage of working math:**
1. `items`: `barcode?`, `genericName` (rename semantic of `medicineGroup`), `strength?` (e.g. "500mg"), `packSize?` ("10x10"), `unitsPerStrip`/`stripsPerBox`, `mrp?`, `reorderLevel?`, `vatRate?`, `schedule?` ('G'|'H'|'H1'|'X'|null), `isSalable` (replaces category-string asset checks).
2. New `batches` subcollection (or array field): `{batchNo, expiryDate, initialQty, remainingQty, cost, mrp, supplierPurchaseId}` — enables FEFO, batch expiry reports, purchase returns to supplier.
3. New `suppliers` collection: `{name, phone, address, dueBalance, distributorOf[]}` — replaces free-text `Purchase.supplier`, enables supplier ledger the payables screen currently fakes via description strings.
4. `sales.items[]`: add `batchId?`, `costAtSale`, `discountAmount` per line; `sales`: add `vatAmount`, `mushakNo?`, `soldBy`.
5. Money: all amounts are raw floats; no rounding strategy. BD VAT/Mushak requires 2-decimal rounding at line and bill level (`Math.round(x*100)/100` helpers in a shared `money.ts`).

### 3.3 Data integrity issues

- **String identity:** purchases locate stock via `where("title","==",name) [+expiryDate]` (`purchase-create.ts:71-74`). Renaming an item orphans future matching; two docs with same title but one lacking expiry collide (`bookSnapshot.docs[0]` takes **first arbitrary match** — `purchase-create.ts:79`).
- **Expiry overwrite:** merging a purchase into an existing item sets `expiryDate` to the *newest* invoice's date (`purchase-create.ts:105`) — old stock's expiry is silently replaced. This is the single most dangerous pharmacy defect in the app.
- **Client-trusted totals:** `addSale` accepts `data.total` and overrides the computed total (`sales-actions.ts:124-126`); price per line comes from the client unchecked. Server must recompute from item MRP/price or an authorized override margin.
- **No composite-index hygiene:** date-range queries on `sales.date` exist (`dashboard.ts:51-55`) — requires a Firestore composite index per query shape; none are committed (no `firestore.indexes.json` in repo).
- **No audit fields** (`createdAt/updatedAt/by`), **no soft deletes** — `deleteSale`/`deleteItem` are hard deletes with no trace.
- **Counters doc contention:** single `metadata/counters` doc serializes all sale numbering — fine for one store, a hotspot per tenant at high TPS (acceptable now, monitor later).

---

## 4. Backend & Business Logic Audit (Efficiency & Edge Cases)

### 4.1 Sales engine (`sales-actions.ts`)

- **Stock deduction:** strict check-then-deduct inside one `runTransaction` with local-map update to handle duplicate lines of the same item (`sales-actions.ts:81-113`) — correct and race-safe. **But it is plain quantity deduction, not FEFO** — there is no batch to choose from; the item's single `expiryDate` is decorative w.r.t. deduction order.
- **No unit conversion:** sells integer `quantity` of the item doc. Buying a box and selling strips is only possible by creating separate item docs per unit type (which some users effectively do via title strings) — no `box→strip→tablet` math exists.
- **Cost basis drift:** sale lines store no cost; profit = `total − (current productionPrice × qty)`, recomputed differently in dashboard (`dashboard.ts:115-125`) and reports (`report-generator.ts:51-59`). After any later purchase changes WAC, historical profit silently restates itself. Freeze `costAtSale` per line at write time (additive).
- **Discount integrity:** POS form forces `discountType:'none'` at submit (`record-sale-form.tsx:101-102`) even though the schema/API fully support discounts — the discount UI is dead in the POS. Meanwhile the API accepts discounts (edit-sale dialog uses them) — inconsistent surfaces.
- **Payment logic:** Due/Split receivable creation with proportional profit recognition (`sales-actions.ts:166-195`) is genuinely well-designed. Edge: `paymentMethod` silently becomes `'Paid by Credit'` when `finalTotal <= 0` (`sales-actions.ts:149`) — a fully credit-covered sale produces no receivable but *does* add `creditApplied` to `dueBalance` (line 162-164) — correct, but the mutation of the payment enum makes reporting categorization fragile.

### 4.2 Purchases & GRN (`purchase-create.ts`, `purchase-update.ts`)

- **GRN capture:** the form does capture expiry date, generic group, company per line (`purchase-item-medicine-fields.tsx`) — good instinct — but **no batch number and no MRP**, and expiry lands on the merged item doc (overwrite problem above). There is **no purchase-order stage** (direct invoice entry) and **no supplier return** anywhere in the backend.
- **Cost capitalization:** `factor = (subtotal + VAT − discount)/subtotal` spread per line, then weighted-average into `productionPrice` (`purchase-create.ts:67-95`) — clean, textbook WAC. Keep exactly this math; extend it to write the batch record too.
- **Silent price mutation:** when no selling price is entered, new price = `max(old, cost × 1.5)` (`purchase-create.ts:95`, `:116`) — a hard-coded 50% markup that will change shelf prices without the pharmacist's consent. Must become a configurable (or per-item) markup, default off.
- **`updatePurchase` full scans:** reads *all* expenses and *all* transactions then filters by `description.includes(purchaseId)` (`purchase-update.ts:39-49`). Beyond cost, **`PUR-0001` is a substring of `PUR-00010`** once counters pass 9,999 — the 4-digit `padStart` guarantees cross-purchase linkage corruption at scale. Link by `purchaseId` field equality, and store an indexable `purchaseDocId` on the expense/payable.
- **Queries inside transactions:** `getDocs` within `runTransaction` are not transactional reads; the delete/update paths can race a concurrent payment recording against the same receivable.

### 4.3 Returns & payments

- **Sales return** (`sales-returns.ts`): stock is **always** added back (no damaged/expired quarantine flag) and the **customer's due is always reduced** (`sales-returns.ts:117-119`) — for a walk-in *cash* sale return this is wrong: it should refund from cash drawer, not create credit. No link to original sale, so profit never reverses; monthly net profit double-counts returned cost (dashboard subtracts return cost but the sale's profit stands).
- **Receive payment / payables** (`transaction-actions-payments.ts`): proportional profit realization on due collection is implemented — good. Payables are a flat ledger without supplier grouping; "Payables (Suppliers)" page groups by parsed description text only.

### 4.4 Hidden risks & scaling limits

1. **Substring ID collision** (above) — data-corruption class.
2. **500-op transaction/batch ceiling** — a wholesale sale or reset touching >500 docs throws mid-flight; `resetDatabase` is one flat batch.
3. **Float money** — no rounding functions anywhere; Mushak requires deterministic 2-decimal output.
4. **Read amplification** — full `getItems` on sidebar nav, full-collection scans in `updatePurchase`, `searchSales` scanning unindexed fields; Firestore bill grows quadratically with catalog size per tenant.
5. **No offline capability** — Firestore is only touched server-side; a BD pharmacy losing internet *cannot bill at all*. Commercial deal-breaker to fix or mitigate (PWA + queued writes or local-cache fallback).
6. **Error handling** — every failure path is `console.error` + generic toast; no error codes, no retry, no telemetry. Support burden when selling to non-technical users.

---

## 5. Frontend & UI/UX Audit (Commercial Polish)

### 5.1 Screen inventory (15 pages)

| Screen | Verdict for pharmacy pace |
|---|---|
| `/sales` POS form | Good skeleton (grid nav, stock column, live totals); **not yet a POS** — see 5.2 |
| `/sales` history + search | Solid: pagination, date filter, PDF/XLSX export |
| `/items` | Full CRUD, filters, closing-stock dialog, bulk shelf update — strong |
| `/purchases` | Line-item entry with autofill from item name — decent GRN feel |
| `/expiry-alerts` | 30/60/90 filters, export — good, but item-level not batch-level |
| `/stock-warnings` | Out-of-stock + low-stock KPIs — good |
| `/dashboard` | KPIs + Recharts; profit number restates with WAC drift |
| `/customers`, `/payables`, `/expenses`, `/reports`, `/sales-returns` | Functional, consistent |
| `/balance-sheet` ("Business Overview") | Personal bookkeeping (capital, security deposits) — niche; reposition or trim |
| `/transfer`, `/bulk-shelf-update` | Fine utilities |
| `/onboarding` | 3-way storeType picker — vestigial once pharmacy-only |

### 5.2 POS speed analysis (the commercial heart)

**Present strengths:** arrow-key cell grid with Enter-to-advance and auto-append row (`sale-items-table.tsx:26-86`); keyboard-navigable fuzzy search over title/company/generic (`searchable-item-select.tsx`, `searchable-item-utils.ts`); in-row stock display blocks overselling visually; alternative-medicine dialog suggests same-generic substitutes — genuinely differentiating for BD substitution habits.

**Friction points, ranked:**
1. **No barcode path at all.** Scanner types into the search box; without a `barcode` field there is nothing to match. Highest-value single addition.
2. **10 blank rows rendered by default** (`record-sale-form.tsx:26`) — visual noise; a single focused search-and-add bar is faster.
3. **Date picker in the sale form** — cashier never touches it; remove from default flow.
4. **Customer is hard-locked to Walk-in** in the POS (`record-sale-form.tsx:96-98`); due sales require the edit dialog afterward — a "due" toggle with phone-number lookup belongs in the flow.
5. **No global hotkeys** (F2 new sale, F4 cash, F8 print last), no held/parked bills, no reprint-last-memo action.
6. **Memo requires a click-through Dialog** then "New Sale" — for 80 mm thermal printers, print should fire on confirm and the form reset instantly.
7. **Discount UI dead** in POS (forced `'none'`) — either wire it or hide it.
8. **No touch-target sizing consideration** — cells are `h-8 text-xs`; fine for keyboard, tight for touch terminals.

### 5.3 Design system

shadcn/Radix consistency is good (toasts, dialogs, forms all standardized). Issues: spreadsheet-style `border-slate-300 rounded-none` tables give an Excel-feel rather than product-feel and clash with the rounded card language elsewhere; `Book` spinner icon on payables/transfer pages (`payables/page.tsx:6`) is bookstore residue; no Bangla localization — for non-tech-savvy BD staff a বাংলা toggle is near-mandatory; dark mode exists but pharmacy terminals are bright-light environments — default light contrast should be the polish target.

---

## 6. Feature Bloat & Missing Professional Features

### 6.1 Bloat to remove (generic-inventory remnants)

| Item | Evidence | Action |
|---|---|---|
| `storeType` trichotomy | `types.ts:23`, onboarding, sidebar, categories, purchase/item forms | Hardcode pharmacy; delete branches |
| Book fields (`author`) | `types.ts:52`, `bookstore-form-fields.tsx`, Book-category fallback `purchase-create.ts:130-132` | Delete |
| Office assets | `add-office-asset-dialog.tsx`, `office-asset-form-fields.tsx`, `office-assets/schema.ts`, `use-add-office-asset.ts`, `db/assets.ts` + the 6-file `assets`/`surgicals` string-check web | Replace with `item.isSalable` flag; surgicals become normal stock |
| Donations | `Donation` type, `lastDonationNumber` counter, report plumbing (`report-generator.ts`) | No creation UI exists — dead |
| Genkit AI | `@genkit-ai/*`, `genkit`, `genkit-cli` in `package.json`; zero imports in `src/` | Uninstall (big install/deploy weight) |
| Orphan components | `transactions-management.tsx` imported by nothing; `add-transaction-dialog.tsx` (check tree-shake); unused shadcn `carousel`, `menubar` | Delete |
| Mock auth | `lib/auth.ts` | Replace with real session (see §7) |
| `resetDatabase` server action | `database.ts:124` | Dev-only; remove from production surface |
| Stale docs | `docs/blueprint.md` (bookstore) | Rewrite |
| `embla-carousel-react`, `patch-package` | package.json; no carousel/patches in use | Verify and drop |
| `secretKey` onboarding/company fields | stored plaintext, never read | Remove |

### 6.2 Missing — must build for the BD market (benchmark: Visual Pharma / Smart Pharma class)

**Compliance & legal**
- Mushak 6.3 sales invoice (BIN, itemized VAT, retailer copy) and VAT chalan; VAT-inclusive MRP handling (`vatRate` per item, `vatAmount` per sale).
- Drug schedule tracking: schedule flags per item, narcotics register (schedule X/H) with separate log, prescription-reference capture on scheduled sales.
- Drug license / DGDA registration numbers on memos.

**Stock professionalism**
- Batch + FEFO (§3), batch-wise expiry board and near-expiry **value** (৳ at risk), expired-stock quarantine, dead-stock/ABC report.
- Reorder levels with auto suggestion list ("below reorder from last supplier").
- Purchase **returns to supplier** (debit note) — absent.
- Strip/box/tablet conversions with fractional dispenser sales (½ strip).

**Partners & money**
- Supplier entity, supplier ledger, statement print; payables grouped by supplier.
- Customer credit limits; due aging buckets; SMS/bKash-nudge reminders (company `bkashNumber` already modeled).
- Day-close: cash count, shift totals, Z-report; cashier identity per sale.

**UX & ops**
- Barcode scan entry + price-label printing (jsPDF already present).
- Bangla/English toggle; 80 mm thermal memo layout; held bills; offline-tolerant billing (queue & sync).
- Salesman/commission field for wholesale-style pharmacies (common in BD).

---

## 7. Technical Debt & Security (For Commercial Sale)

### 7.1 Debt that slows development
- **Duplicated 200-line twins:** `addSale` vs `updateSale` differ only in reversal prologue; `purchase-create` vs `purchase-update` duplicate the entire expense/payable emission block (`purchase-create.ts:148-197` ≈ `purchase-update.ts:241-290`). Extract shared pure calculators (`computeSaleTotals`, `emitPurchaseSettlements`) — this is also the safe seam for adding FEFO without touching the transaction shells.
- **`any` throughout** (`cleanedData: any`, `ref: any`, `getDefaultValues() as any`, `AuthUser.createdAt: any`) — violates the repo's own AGENTS.md type-safety rule.
- **Magic strings:** `'Cash'|'Bank'|'Due'|'Split'` unions redeclared in `types.ts`, sales/purchase/expense schemas; `'assets'`/`'surgicals'` checks (§2.2). Centralize as consts/unions.
- **Facade indirection** (`sales.ts` → `sales-queries/actions`) adds a file per domain with zero logic — either give facades real purpose (tenant guard, §7.2) or collapse.
- **Zero tests, zero CI.** The math the owner trusts is exactly what needs characterization tests (totals, WAC, due reversal) before any refactor ships.

### 7.2 Security (blocking for commercial)
1. **Tenant trust:** all actions take `userId` from the client. Add Firebase Admin session-cookie verification in a shared guard used by every action, derive `uid` server-side, and drop the parameter. This is the *prerequisite* for multi-store sales.
2. **Rules:** no `firestore.rules`/`firestore.indexes.json` committed. Rules must lock `users/{uid}/**` to the session user; commit them so environments are reproducible.
3. **RBAC:** none. Model `owner | pharmacist | cashier` on the user doc; cashier cannot delete sales or edit prices beyond margin; pharmacist approves returns; owner sees reports/capital. This maps directly to how BD pharmacies actually staff the counter.
4. **Audit log:** new `audit_logs` collection written inside the existing transactions for sale delete/edit, purchase edit, price override, stock adjust — your best support & dispute tool once strangers run the app.
5. **Input validation server-side:** Zod schemas exist client-side only; the API trusts `price`, `total`, `discountValue`. Validate server-side against item MRP/authorized margins.
6. **Data protection:** plaintext `secretKey` in the user doc must go; backups/exports (xlsx) contain full PII — document retention; Firebase project access hygiene.

---

## 8. Low-Cost, High-Impact Commercialization Roadmap

Constraint honored: **no rewrite of working math.** Every phase keeps the `runTransaction` skeletons and WAC formulas; changes are additive fields, extracted pure functions, and deletions.

### Phase 1 — Trim & Polish (quick wins, ~1–2 weeks)
1. Delete bloat list §6.1: storeTypes, book fields, office assets, donations, orphan components, Genkit deps, mock auth, `resetDatabase`, stale blueprint.
2. Introduce `isSalable` on items (migration script in `scripts/`); remove all `assets/surgicals` string checks.
3. POS focus pass: remove date field + 10 blank rows in favor of one autofocus search row + compact lines; keep the grid nav; wire or hide the discount UI; auto-print on confirm with instant form reset; add "Reprint last memo".
4. Fix sidebar to fetch counts once per data-change event (or lightweight `stats` endpoint) instead of full `getItems` per navigation.
5. Extract `computeSaleTotals`/`emitPurchaseSettlements` from the twins (pure functions + characterization tests: totals, WAC, due reversal, return math).
6. Replace `PUR-####` substring matching with exact `purchaseId` field equality (stops the 5-digit collision class before it ever fires).
7. Rename user-facing vocabulary to pharmacy terms (Items → Medicines/Stock, GRN for purchase receipt, etc.); fix `Book` spinner icons.

### Phase 2 — Logic Optimization: batch, FEFO, units (~3–5 weeks)
1. Schema v2 (additive): `items` gains `barcode, genericName, strength, packSize, mrp, reorderLevel, vatRate, schedule, isSalable`; new `batches` records `{batchNo, expiry, qty, cost, mrp, purchaseId}`; `sales.items[]` gains `batchId, costAtSale`.
2. Migration script (one-time, backup-first via existing xlsx export): current item → single batch from its `expiryDate`/WAC.
3. **FEFO inside the existing sale transaction:** in `addSale`'s deduction loop, replace single-field decrement with an ordered batch allocation (earliest non-expired batch first), writing per-batch `remainingQty` updates in the same transaction — totals/WAC math untouched; profit freezes via `costAtSale`.
4. GRN upgrade: purchase lines capture `batchNo`, `MRP`, pack quantity (box/strip); each line *creates/updates batches* instead of mutating item-level expiry — removes the overwrite defect permanently. Markup default `1.5` becomes tenant setting, off by default.
5. Unit conversion: sell in strips/tablets against batch quantity with per-unit MRP math; quantity stays numeric (no model break).
6. Reporting fix: dashboard/reports prefer `costAtSale` when present (falls back to current WAC for history).

### Phase 3 — Pro Features Integration (~4–6 weeks)
1. Supplier entity + ledger + **purchase returns** (debit note reverses batch qty and payable).
2. Mushak 6.3 invoice + VAT on sales (`vatRate` → line VAT, 2-decimal money helpers), BIN on memo, VAT report by month.
3. Drug schedule flags + narcotics register + prescription ref on scheduled sales.
4. Expiry dashboard on batches: ৳-at-risk, quarantine flow, dead-stock/ABC; reorder suggestions.
5. Barcode: field + POS scan-to-add + label print (jsPDF), EAN-13.
6. Bangla toggle (i18n dictionary), 80 mm thermal layout, held bills, due-customer quick pick by phone, SMS reminder integration (local gateway), day-close Z-report with cash count.

### Phase 4 — Hardening for Sale (~2–4 weeks)
1. Firebase Admin session cookies; server-side `uid` guard in a single wrapper used by all actions; commit `firestore.rules` + `firestore.indexes.json`.
2. RBAC roles + audit logs on all destructive/margin actions; server-side Zod validation of sale payloads.
3. Ops: Sentry (free tier), structured error codes, backup/export job, batch-safe `resetDatabase` or its removal, transaction 500-op guard for large invoices.
4. Commercial packaging: per-tenant onboarding (already multi-tenant by `users/{uid}`), usage-based Firestore budget alerts, support runbook, license terms, and a demo dataset mode for sales visits.

**Sequencing rationale:** Phase 1 shrinks attack/error surface and costs days; Phase 2 is the only schema-touching phase and lands behind a migration with tests from Phase 1; Phase 3 is independent feature work on the stabilized model; Phase 4 gates the moment you take money from a second pharmacy. Offline billing ( flagged in §4.4) is the one item intentionally scheduled for post-MVP research — it is architecturally significant and should not block first commercial deployments in reliably-connected areas.
