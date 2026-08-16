import { describe, it, expect } from 'vitest';
import {
  computePurchaseTotals,
  mergeReceivedStock,
  reconcileItemState,
  planPurchaseSettlements,
} from '../purchase-calculation';

describe('computePurchaseTotals', () => {
  const items = [
    { cost: 10, quantity: 5 },
    { cost: 3, quantity: 20 },
  ];

  it('sums line costs', () => {
    const t = computePurchaseTotals({ items });
    expect(t.totalAmount).toBe(110);
    expect(t.vatAmount).toBe(0);
    expect(t.finalAmount).toBe(110);
    expect(t.factor).toBe(1);
  });

  it('percentage VAT and discount feed factor and final amount', () => {
    const t = computePurchaseTotals({ items, vatType: 'percentage', vatValue: 5, discountAmount: 10 });
    expect(t.vatAmount).toBeCloseTo(5.5, 10);
    expect(t.finalAmount).toBeCloseTo(105.5, 10);
    expect(t.factor).toBeCloseTo(105.5 / 110, 10);
  });

  it('flat VAT amount', () => {
    const t = computePurchaseTotals({ items, vatType: 'amount', vatValue: 15 });
    expect(t.finalAmount).toBe(125);
  });

  it('empty invoice keeps factor at 1 (no division by zero)', () => {
    const t = computePurchaseTotals({ items: [] });
    expect(t.factor).toBe(1);
  });
});

describe('mergeReceivedStock (weighted average cost)', () => {
  it('weights incoming cost against existing stock value', () => {
    const r = mergeReceivedStock(10, 8, 10, 12);
    // (10*8 + 10*12) / 20
    expect(r.newStock).toBe(20);
    expect(r.newProductionPrice).toBe(10);
  });

  it('first receipt sets cost directly', () => {
    const r = mergeReceivedStock(0, 0, 5, 7.5);
    expect(r.newStock).toBe(5);
    expect(r.newProductionPrice).toBe(7.5);
  });
});

describe('reconcileItemState (purchase edit)', () => {
  it('removes old lines at raw cost and adds new at capitalized cost (pinned behavior)', () => {
    // Current: 10 units @ 8. Old invoice: 5 @ 10 raw. New invoice: 8 @ 9 capitalized.
    const r = reconcileItemState(10, 8, [{ quantity: 5, cost: 10 }], [{ quantity: 8, cost: 9 }]);
    // stock 10-5+8 = 13; value 80-50+72 = 102 → price 102/13
    expect(r.stock).toBe(13);
    expect(r.productionPrice).toBeCloseTo(102 / 13, 10);
  });

  it('floors subtraction at zero when old lines exceed recorded state', () => {
    const r = reconcileItemState(3, 5, [{ quantity: 10, cost: 5 }], []);
    expect(r.stock).toBe(0);
    expect(r.productionPrice).toBe(0);
  });
});

describe('planPurchaseSettlements', () => {
  const base = {
    purchaseId: 'PUR-0001',
    supplier: 'ACME Distributors',
    finalAmount: 500,
    nextExpenseNumber: 10,
  };

  it('cash purchase emits one full expense', () => {
    const p = planPurchaseSettlements({ ...base, paymentMethod: 'Cash' });
    expect(p.writes).toHaveLength(1);
    expect(p.writes[0].kind).toBe('expense');
    if (p.writes[0].kind === 'expense') {
      expect(p.writes[0].data.amount).toBe(500);
      expect(p.writes[0].data.expenseId).toBe('EXP-0011');
      expect(p.writes[0].data.purchaseId).toBe('PUR-0001');
    }
    expect(p.lastExpenseNumber).toBe(11);
  });

  it('due purchase emits one full payable', () => {
    const p = planPurchaseSettlements({ ...base, paymentMethod: 'Due' });
    expect(p.writes).toHaveLength(1);
    expect(p.writes[0].kind).toBe('payable');
    if (p.writes[0].kind === 'payable') {
      expect(p.writes[0].data.amount).toBe(500);
      expect(p.writes[0].data.description).toBe('Purchase PUR-0001 from ACME Distributors');
    }
    expect(p.lastExpenseNumber).toBe(10);
  });

  it('split emits partial expense plus balance payable', () => {
    const p = planPurchaseSettlements({
      ...base,
      paymentMethod: 'Split',
      amountPaid: 200,
      splitPaymentMethod: 'Bank',
    });
    expect(p.writes).toHaveLength(2);
    expect(p.writes[0].kind).toBe('expense');
    expect(p.writes[1].kind).toBe('payable');
    if (p.writes[0].kind === 'expense' && p.writes[1].kind === 'payable') {
      expect(p.writes[0].data.amount).toBe(200);
      expect(p.writes[1].data.amount).toBe(300);
    }
    expect(p.lastExpenseNumber).toBe(11);
  });

  it('emits nothing for zero final amount', () => {
    const p = planPurchaseSettlements({ ...base, finalAmount: 0, paymentMethod: 'Cash' });
    expect(p.writes).toHaveLength(0);
    expect(p.lastExpenseNumber).toBe(10);
  });
});
