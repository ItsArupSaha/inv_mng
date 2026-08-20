import { describe, it, expect } from 'vitest';
import { allocateFEFO, sumBatchQuantities, pickBatchForAdjustment, earlierExpiry } from '../batch-allocation';

const batches = [
  { id: 'b3', batchNo: 'BN-3', expiryDate: '2027-06-01', quantity: 10, cost: 8 },
  { id: 'b1', batchNo: 'BN-1', expiryDate: '2026-01-01', quantity: 5, cost: 7 },
  { id: 'b2', batchNo: 'BN-2', expiryDate: null, quantity: 4, cost: 9 },
  { id: 'b4', batchNo: 'BN-4', expiryDate: '2026-01-01', quantity: 3, cost: 6 },
];

describe('allocateFEFO', () => {
  it('consumes earliest expiry first, no-expiry last', () => {
    const plan = allocateFEFO(batches, 7);
    expect(plan.remainingQuantity).toBe(0);
    expect(plan.allocations).toEqual([
      expect.objectContaining({ batchId: 'b1', quantity: 5, costAtSale: 7 }),
      expect.objectContaining({ batchId: 'b4', quantity: 2, costAtSale: 6 }),
    ]);
  });

  it('splits across batches and freezes per-batch cost', () => {
    const plan = allocateFEFO(batches, 9);
    const byId = Object.fromEntries(plan.allocations.map(a => [a.batchId, a]));
    expect(byId.b1.quantity).toBe(5);
    expect(byId.b4.quantity).toBe(3);
    expect(byId.b1.costAtSale).toBe(7);
    expect(plan.remainingQuantity).toBe(0); // b4 covered the rest
  });

  it('no-expiry batch is consumed only after dated ones', () => {
    const plan = allocateFEFO(batches, 15); // 5 + 3 + 10 dated = 18
    const ids = plan.allocations.map(a => a.batchId);
    expect(ids).toEqual(['b1', 'b4', 'b3']);
    expect(ids).not.toContain('b2');
  });

  it('reports shortfall when total stock is insufficient', () => {
    const total = sumBatchQuantities(batches);
    const plan = allocateFEFO(batches, total + 6);
    expect(plan.remainingQuantity).toBe(6);
  });

  it('skips empty batches', () => {
    const plan = allocateFEFO([{ id: 'x', batchNo: 'X', expiryDate: '2026-01-01', quantity: 0, cost: 1 }], 1);
    expect(plan.allocations).toHaveLength(0);
    expect(plan.remainingQuantity).toBe(1);
  });

  it('returns nothing for zero quantity', () => {
    expect(allocateFEFO(batches, 0).allocations).toHaveLength(0);
  });
});

describe('helpers', () => {
  it('pickBatchForAdjustment returns FEFO-first batch', () => {
    expect(pickBatchForAdjustment(batches)?.id).toBe('b1');
  });

  it('earlierExpiry keeps the minimum date and tolerates blanks', () => {
    expect(earlierExpiry('2027-01-01', '2026-01-01')).toBe('2026-01-01');
    expect(earlierExpiry('2026-01-01', '2027-01-01')).toBe('2026-01-01');
    expect(earlierExpiry(undefined, '2026-01-01')).toBe('2026-01-01');
    expect(earlierExpiry('2026-01-01', undefined)).toBe('2026-01-01');
  });
});
