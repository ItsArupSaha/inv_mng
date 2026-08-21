import type { PurchaseItem, PurchaseReturn } from './types';

/**
 * How many units of each purchase line can still be sent back, given every
 * return already recorded against the purchase.
 */
export function remainingReturnableQuantities(
  purchaseItems: PurchaseItem[],
  existingReturns: PurchaseReturn[]
): number[] {
  const returned = new Array(purchaseItems.length).fill(0);
  for (const supplierReturn of existingReturns) {
    for (const line of supplierReturn.items) {
      if (line.lineIndex >= 0 && line.lineIndex < returned.length) {
        returned[line.lineIndex] += Number(line.quantity) || 0;
      }
    }
  }
  return purchaseItems.map((item, index) => Math.max(0, (Number(item.quantity) || 0) - returned[index]));
}

export interface RefundLineInput {
  lineIndex: number;
  quantity: number;
  cost: number;
}

export function computeRefundTotal(lines: RefundLineInput[]): number {
  return lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.cost) || 0), 0);
}

export interface PayableLike {
  id: string;
  amount: number;
  date?: string;
}

export interface PayableReduction {
  payableId: string;
  reduceBy: number;
}

/**
 * Spreads a refund across the supplier's pending payables oldest-first. When
 * the outstanding due cannot cover the refund value, returns null — the caller
 * must reject a due-adjustment in that case so money is never silently dropped.
 */
export function planDueAdjustment(
  pendingPayables: PayableLike[],
  refundValue: number
): PayableReduction[] | null {
  if (refundValue <= 0) return [];
  const ordered = [...pendingPayables].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '') || a.id.localeCompare(b.id)
  );
  const reductions: PayableReduction[] = [];
  let remaining = refundValue;

  for (const payable of ordered) {
    if (remaining <= 0) break;
    const available = Number(payable.amount) || 0;
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    reductions.push({ payableId: payable.id, reduceBy: take });
    remaining -= take;
  }

  return remaining > 0 ? null : reductions;
}
