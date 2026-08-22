import { describe, it, expect } from 'vitest';
import { computeSaleTotals, buildReceivable } from '../sale-calculation';

describe('computeSaleTotals', () => {
  const base = {
    items: [
      { itemId: 'a', quantity: 2, price: 50 },
      { itemId: 'b', quantity: 1, price: 120 },
    ],
    totalProductionCost: 150,
    discountType: 'none' as const,
    discountValue: 0,
    creditApplied: 0,
  };

  it('sums subtotal from price × quantity', () => {
    const t = computeSaleTotals(base);
    expect(t.subtotal).toBe(220);
    expect(t.discountAmount).toBe(0);
    expect(t.totalAfterDiscount).toBe(220);
    expect(t.finalTotal).toBe(220);
    expect(t.totalSaleProfit).toBe(70);
  });

  it('applies percentage discount on subtotal and clamps profit', () => {
    const t = computeSaleTotals({ ...base, discountType: 'percentage', discountValue: 10 });
    expect(t.discountAmount).toBe(22);
    expect(t.totalAfterDiscount).toBe(198);
    expect(t.totalSaleProfit).toBe(48);
  });

  it('applies flat amount discount', () => {
    const t = computeSaleTotals({ ...base, discountType: 'amount', discountValue: 20 });
    expect(t.totalAfterDiscount).toBe(200);
  });

  it('clamps discount to subtotal so total never goes negative', () => {
    const t = computeSaleTotals({ ...base, discountType: 'amount', discountValue: 999 });
    expect(t.discountAmount).toBe(220);
    expect(t.totalAfterDiscount).toBe(0);
  });

  it('extra sales increases total and profit as pure revenue', () => {
    const t = computeSaleTotals({ ...base, extraSales: 30 });
    expect(t.totalAfterDiscount).toBe(250);
    expect(t.finalTotal).toBe(250);
    expect(t.totalSaleProfit).toBe(100);
  });

  it('totalOverride rounds down or customizes total and adjusts profit correctly', () => {
    const t = computeSaleTotals({ ...base, totalOverride: 200 });
    expect(t.totalAfterDiscount).toBe(200);
    expect(t.finalTotal).toBe(200);
    expect(t.totalSaleProfit).toBe(50); // 200 - 150 cost
  });

  it('totalOverride rounds up total and increases profit accordingly', () => {
    const t = computeSaleTotals({ ...base, totalOverride: 230 });
    expect(t.totalAfterDiscount).toBe(230);
    expect(t.finalTotal).toBe(230);
    expect(t.totalSaleProfit).toBe(80); // 230 - 150 cost
  });

  it('ignores negative totalOverride', () => {
    const t = computeSaleTotals({ ...base, totalOverride: -10 });
    expect(t.totalAfterDiscount).toBe(220);
    expect(t.finalTotal).toBe(220);
  });

  it('credit applied reduces finalTotal but not recorded total or profit', () => {
    const t = computeSaleTotals({ ...base, creditApplied: 70 });
    expect(t.totalAfterDiscount).toBe(220);
    expect(t.finalTotal).toBe(150);
    expect(t.totalSaleProfit).toBe(70);
  });

  it('treats missing price as zero', () => {
    const t = computeSaleTotals({
      items: [{ itemId: 'x', quantity: 3, price: undefined as unknown as number }],
      totalProductionCost: 10,
      discountType: 'none',
      creditApplied: 0,
    });
    expect(t.subtotal).toBe(0);
    expect(t.totalSaleProfit).toBe(-10);
  });
});

describe('buildReceivable', () => {
  const base = {
    finalTotal: 200,
    totalSaleProfit: 80,
    creditApplied: 0,
    saleId: 'SALE-0001',
    customerId: 'c1',
  };

  it('returns null for cash sales', () => {
    expect(buildReceivable({ ...base, paymentMethod: 'Cash' })).toBeNull();
  });

  it('full amount due for Due sales', () => {
    const r = buildReceivable({ ...base, paymentMethod: 'Due' });
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(200);
    expect(r!.description).toBe('Due from SALE-0001');
    expect(r!.remainingProfit).toBe(80);
    expect(r!.totalSaleProfit).toBe(80);
  });

  it('split payment books only the unpaid remainder and recognizes paid-share profit', () => {
    const r = buildReceivable({ ...base, paymentMethod: 'Split', amountPaid: 50 });
    expect(r!.amount).toBe(150);
    // realized = 80 * (50/200) = 20, remaining = 60
    expect(r!.remainingProfit).toBeCloseTo(60, 10);
  });

  it('returns null when split covers the whole total', () => {
    expect(buildReceivable({ ...base, paymentMethod: 'Split', amountPaid: 200 })).toBeNull();
  });
});
