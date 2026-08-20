import type { SaleBatchAllocation } from './types';

export type AllocatableBatch = {
  id: string;
  batchNo: string;
  expiryDate?: string | null;
  quantity: number;
  cost: number;
};

export type BatchAllocationPlan = {
  allocations: SaleBatchAllocation[];
  remainingQuantity: number; // unsatisfiable portion when stock is short
};

/**
 * FEFO: First-Expiry-First-Out. Allocates `quantity` across batches ordered
 * by earliest expiry first; batches without an expiry date are consumed
 * last. Ties break by batch id for deterministic output.
 */
export function allocateFEFO(batches: AllocatableBatch[], quantity: number): BatchAllocationPlan {
  const ordered = [...batches].sort((a, b) => {
    const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
    const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
    if (aExp !== bExp) return aExp - bExp;
    return a.id.localeCompare(b.id);
  });

  const allocations: SaleBatchAllocation[] = [];
  let remaining = quantity;

  for (const batch of ordered) {
    if (remaining <= 0) break;
    if (batch.quantity <= 0) continue;

    const take = Math.min(batch.quantity, remaining);
    allocations.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate ?? null,
      quantity: take,
      costAtSale: batch.cost,
    });
    remaining -= take;
  }

  return { allocations, remainingQuantity: Math.max(0, remaining) };
}

/** Sum of live batch quantities for stock reconciliation. */
export function sumBatchQuantities(batches: { quantity: number }[]): number {
  return batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
}

/** Weighted-average cost merge at batch level when merging receipts. */
export function mergeBatchCost(
  currentQty: number,
  currentCost: number,
  addQty: number,
  addCost: number
): number {
  const newQty = currentQty + addQty;
  if (newQty <= 0) return 0;
  return (currentQty * currentCost + addQty * addCost) / newQty;
}

/**
 * Picks the batch a manual stock adjustment should land on: the FEFO-first
 * batch for increases and decreases alike, so counts stay aligned with what
 * the counter would physically grab next.
 */
export function pickBatchForAdjustment<T extends AllocatableBatch>(batches: T[]): T | null {
  const ordered = [...batches].sort((a, b) => {
    const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
    const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
    if (aExp !== bExp) return aExp - bExp;
    return a.id.localeCompare(b.id);
  });
  return ordered.find(b => b.quantity !== 0) || null;
}

/**
 * Spreads a manual stock delta (new minus old total) across batches in FEFO
 * order: decreases consume from the earliest-expiry batch first; increases
 * land on the earliest-expiry batch. Leftover surplus after all batches are
 * filled is reported so the caller can open an adjustment batch.
 */
export function distributeStockDelta(
  batches: AllocatableBatch[],
  delta: number
): { updates: { id: string; quantity: number }[]; surplus: number } {
  const ordered = [...batches].sort((a, b) => {
    const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
    const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
    if (aExp !== bExp) return aExp - bExp;
    return a.id.localeCompare(b.id);
  });

  let remaining = delta;
  const updates: { id: string; quantity: number }[] = [];

  for (const batch of ordered) {
    if (remaining === 0) break;
    let nextQty = batch.quantity + remaining;
    if (nextQty < 0) {
      remaining = nextQty; // batch exhausted, carry the deficit forward
      nextQty = 0;
    } else {
      remaining = 0;
    }
    if (nextQty !== batch.quantity) {
      updates.push({ id: batch.id, quantity: nextQty });
    }
  }

  return { updates, surplus: remaining > 0 ? remaining : 0 };
}

/** Earlier of two expiry date strings, ignoring empty values. */
export function earlierExpiry(
  current: string | null | undefined,
  incoming: string | null | undefined
): string | null | undefined {
  if (!current) return incoming || null;
  if (!incoming) return current;
  return new Date(incoming).getTime() < new Date(current).getTime() ? incoming : current;
}
