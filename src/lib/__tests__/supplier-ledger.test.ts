import { describe, expect, it } from 'vitest';
import type { Expense, Purchase, PurchaseReturn, Transaction } from '../types';
import {
  buildSupplierLedgerEntries,
  buildSupplierSummaries,
  ledgerDocMatchesPurchase,
  type SupplierLedgerInput
} from '../supplier-ledger';
import { computeRefundTotal, planDueAdjustment, remainingReturnableQuantities } from '../purchase-return-math';
import type { PurchaseItem } from '../types';

function makePurchase(overrides: Partial<Purchase> & { purchaseId: string; supplier: string }): Purchase {
  return {
    id: `doc-${overrides.purchaseId}`,
    date: '2026-01-10T00:00:00.000Z',
    items: [],
    totalAmount: 1000,
    paymentMethod: 'Due',
    dueDate: '2026-02-10T00:00:00.000Z',
    ...overrides,
  } as Purchase;
}

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-doc-1',
    expenseId: 'EXP-0001',
    date: '2026-01-11T00:00:00.000Z',
    name: '',
    description: '',
    amount: 500,
    ...overrides,
  } as Expense;
}

function makePayable(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'txn-doc-1',
    description: '',
    amount: 400,
    dueDate: '2026-02-10T00:00:00.000Z',
    status: 'Pending',
    type: 'Payable',
    ...overrides,
  } as Transaction;
}

function makeReturn(overrides: Partial<PurchaseReturn>): PurchaseReturn {
  return {
    id: 'prt-doc-1',
    returnId: 'PRT-0001',
    date: '2026-01-12T00:00:00.000Z',
    purchaseDocId: 'doc-PUR-0001',
    purchaseId: 'PUR-0001',
    supplier: 'Supplier A',
    items: [{ lineIndex: 0, itemName: 'Napa', quantity: 10, cost: 1 }],
    totalReturnValue: 10,
    refundMethod: 'Due',
    ...overrides,
  } as PurchaseReturn;
}

describe('ledgerDocMatchesPurchase', () => {
  it('matches docs carrying the purchaseId field', () => {
    expect(ledgerDocMatchesPurchase({ purchaseId: 'PUR-0007' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ purchaseId: 'PUR-0008' }, 'PUR-0007')).toBe(false);
  });

  it('matches the legacy expense descriptions', () => {
    expect(ledgerDocMatchesPurchase({ description: 'Payment for Purchase PUR-0007' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Partial payment for Purchase PUR-0007' }, 'PUR-0007')).toBe(true);
  });

  it('matches payable and paid-payable descriptions with any supplier suffix', () => {
    expect(ledgerDocMatchesPurchase({ description: 'Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Balance for Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Paid Payable: Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Paid Payable: Balance for Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
  });

  it('does not collide across similarly numbered purchases', () => {
    expect(ledgerDocMatchesPurchase({ description: 'Payment for Purchase PUR-00010' }, 'PUR-0001')).toBe(false);
    expect(ledgerDocMatchesPurchase({ description: 'Purchase PUR-00010 from Acme Ltd' }, 'PUR-0001')).toBe(false);
  });
});

describe('buildSupplierSummaries', () => {
  it('aggregates purchases, payments, returns, and pending dues per supplier', () => {
    const input: SupplierLedgerInput = {
      purchases: [
        makePurchase({ purchaseId: 'PUR-0001', supplier: 'Supplier A', totalAmount: 1000 }),
        makePurchase({ purchaseId: 'PUR-0002', supplier: 'Supplier B', totalAmount: 2000, vatAmount: 100, discountAmount: 100, paymentMethod: 'Cash' }),
      ],
      expenses: [
        makeExpense({ amount: 2000, purchaseId: 'PUR-0002' }),
        makeExpense({ amount: 500, description: 'Payment for Purchase PUR-0001' }),
        makeExpense({ amount: -30, purchaseId: 'PUR-0001' }), // refund received
      ],
      payables: [
        makePayable({ amount: 400, purchaseId: 'PUR-0001' }),
        makePayable({ amount: 100, purchaseId: 'PUR-0001', status: 'Paid' }),
      ],
      returns: [makeReturn({ supplier: 'Supplier A', totalReturnValue: 30 })],
    };

    const summaries = buildSupplierSummaries(input);
    const a = summaries.find(s => s.supplier === 'Supplier A');
    const b = summaries.find(s => s.supplier === 'Supplier B');

    expect(a).toBeDefined();
    expect(a?.purchaseCount).toBe(1);
    expect(a?.totalPurchased).toBe(1000);
    expect(a?.totalPaid).toBe(470); // 500 payment minus 30 refund
    expect(a?.totalReturned).toBe(30);
    expect(a?.outstanding).toBe(400); // only the pending payable counts

    expect(b?.totalPurchased).toBe(2000);
    expect(b?.totalPaid).toBe(2000);
    expect(b?.outstanding).toBe(0);
  });
});

describe('buildSupplierLedgerEntries', () => {
  it('builds a chronological statement with a running balance', () => {
    const input: SupplierLedgerInput = {
      purchases: [makePurchase({ purchaseId: 'PUR-0001', supplier: 'Supplier A' })],
      expenses: [makeExpense({ amount: 400, description: 'Payment for Purchase PUR-0001' })],
      payables: [],
      returns: [makeReturn({ supplier: 'Supplier A', totalReturnValue: 30 })],
    };

    const entries = buildSupplierLedgerEntries('Supplier A', input);
    expect(entries.map(e => e.type)).toEqual(['purchase', 'payment', 'return']);
    expect(entries[0].balance).toBe(1000);
    expect(entries[1].balance).toBe(600);
    expect(entries[2].balance).toBe(570);

    // Other suppliers are excluded.
    expect(buildSupplierLedgerEntries('Supplier B', input)).toHaveLength(0);
  });
});

describe('purchase return math', () => {
  const purchaseItems: PurchaseItem[] = [
    { itemName: 'Napa', categoryId: 'c1', categoryName: 'Tab', quantity: 100, cost: 1 },
    { itemName: 'Seclo', categoryId: 'c1', categoryName: 'Tab', quantity: 50, cost: 2 },
  ];

  it('subtracts already-returned quantities from what can still be returned', () => {
    const returns = [
      makeReturn({ items: [{ lineIndex: 0, itemName: 'Napa', quantity: 30, cost: 1 }] }),
    ];
    expect(remainingReturnableQuantities(purchaseItems, returns)).toEqual([70, 50]);
  });

  it('never goes negative even with overlapping returns', () => {
    const returns = [
      makeReturn({ items: [{ lineIndex: 0, itemName: 'Napa', quantity: 80, cost: 1 }] }),
      makeReturn({ items: [{ lineIndex: 0, itemName: 'Napa', quantity: 40, cost: 1 }] }),
    ];
    expect(remainingReturnableQuantities(purchaseItems, returns)).toEqual([0, 50]);
  });

  it('computes the refund total from invoice line costs', () => {
    expect(computeRefundTotal([
      { lineIndex: 0, quantity: 10, cost: 1.5 },
      { lineIndex: 1, quantity: 5, cost: 2 },
    ])).toBe(25);
  });

  it('spreads a due adjustment oldest-first and rejects shortfalls', () => {
    const payables = [
      { id: 'b', amount: 100, date: '2026-02-01' },
      { id: 'a', amount: 50, date: '2026-01-01' },
    ];
    expect(planDueAdjustment(payables, 120)).toEqual([
      { payableId: 'a', reduceBy: 50 },
      { payableId: 'b', reduceBy: 70 },
    ]);
    expect(planDueAdjustment(payables, 151)).toBeNull();
    expect(planDueAdjustment(payables, 0)).toEqual([]);
  });
});
