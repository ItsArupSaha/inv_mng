import type { SaleItem } from '../types';

export type SaleDiscountType = 'none' | 'percentage' | 'amount';
export type SalePaymentMethod = 'Cash' | 'Bank' | 'Due' | 'Split' | 'Paid by Credit';

export interface SaleTotals {
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  finalTotal: number;
  totalSaleProfit: number;
}

export interface SaleTotalsInput {
  items: SaleItem[];
  totalProductionCost: number;
  discountType: SaleDiscountType;
  discountValue?: number;
  totalOverride?: number | null;
  creditApplied: number;
}

/**
 * Single source of truth for sale money math.
 * Mirrors the exact formulas previously inlined in addSale/updateSale:
 * - subtotal = Σ price × qty
 * - discount clamped to subtotal
 * - explicit total override wins when >= 0
 * - profit = totalAfterDiscount − production cost
 * - finalTotal = totalAfterDiscount − credit applied
 */
export function computeSaleTotals(input: SaleTotalsInput): SaleTotals {
  const subtotal = input.items.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  let discountAmount = 0;
  if (input.discountType === 'percentage' && input.discountValue !== undefined) {
    discountAmount = subtotal * (input.discountValue / 100);
  } else if (input.discountType === 'amount' && input.discountValue !== undefined) {
    discountAmount = input.discountValue;
  }
  discountAmount = Math.min(subtotal, discountAmount);

  let totalAfterDiscount = subtotal - discountAmount;
  if (input.totalOverride !== undefined && input.totalOverride !== null && input.totalOverride >= 0) {
    totalAfterDiscount = input.totalOverride;
  }

  const totalSaleProfit = totalAfterDiscount - input.totalProductionCost;
  const finalTotal = totalAfterDiscount - input.creditApplied;

  return { subtotal, discountAmount, totalAfterDiscount, finalTotal, totalSaleProfit };
}

export interface ReceivableDraft {
  description: string;
  amount: number;
  status: 'Pending';
  type: 'Receivable';
  customerId: string;
  saleId: string;
  totalSaleProfit: number;
  remainingProfit: number;
}

export interface ReceivableInput {
  paymentMethod: SalePaymentMethod;
  amountPaid?: number;
  finalTotal: number;
  totalSaleProfit: number;
  creditApplied: number;
  saleId: string;
  customerId: string;
}

/**
 * Returns the receivable ledger entry for Due/Split sales, or null when
 * nothing remains owed. Profit recognition is proportional to what was
 * paid at sale time (Split); the rest is recognized on collection.
 */
export function buildReceivable(input: ReceivableInput): ReceivableDraft | null {
  if (input.paymentMethod !== 'Due' && input.paymentMethod !== 'Split') return null;

  let dueAmount = input.finalTotal;
  let realizedProfit = 0;

  if (input.paymentMethod === 'Split' && input.amountPaid && input.amountPaid > 0) {
    dueAmount = input.finalTotal - input.amountPaid;
    if (input.finalTotal > 0) {
      realizedProfit = input.totalSaleProfit * (input.amountPaid / input.finalTotal);
    }
  }

  if (dueAmount <= 0) return null;

  return {
    description: `Due from ${input.saleId}`,
    amount: dueAmount,
    status: 'Pending',
    type: 'Receivable',
    customerId: input.customerId,
    saleId: input.saleId,
    totalSaleProfit: input.totalSaleProfit,
    remainingProfit: input.totalSaleProfit - realizedProfit,
  };
}
