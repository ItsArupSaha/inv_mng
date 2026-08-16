export type PurchasePaymentMethod = 'Cash' | 'Bank' | 'Due' | 'Split' | 'N/A';

export interface PurchaseTotals {
  totalAmount: number;
  vatAmount: number;
  finalAmount: number;
  factor: number;
}

export interface PurchaseTotalsInput {
  items: { cost: number; quantity: number }[];
  discountAmount?: number;
  vatType?: 'amount' | 'percentage';
  vatValue?: number;
}

/**
 * Purchase invoice money math, extracted verbatim from addPurchase/updatePurchase.
 * `factor` spreads invoice-level VAT and discount onto line costs so landed
 * cost can be capitalized into weighted-average item cost.
 */
export function computePurchaseTotals(input: PurchaseTotalsInput): PurchaseTotals {
  const totalAmount = input.items.reduce(
    (acc, item) => acc + item.cost * item.quantity,
    0
  );
  const discountAmount = input.discountAmount || 0;
  const vatType = input.vatType || 'amount';
  const vatValue = input.vatValue || 0;
  const vatAmount = vatType === 'percentage' ? (totalAmount * vatValue) / 100 : vatValue;
  const finalAmount = totalAmount + vatAmount - discountAmount;
  const factor = totalAmount > 0 ? finalAmount / totalAmount : 1;

  return { totalAmount, vatAmount, finalAmount, factor };
}

export interface ItemStateDelta {
  quantity: number;
  cost: number;
}

/**
 * Weighted-average cost merge for receiving stock.
 * Mirrors the original addPurchase math: value in + value out over new stock.
 */
export function mergeReceivedStock(
  currentStock: number,
  currentPrice: number,
  quantity: number,
  capitalizedCost: number
): { newStock: number; newProductionPrice: number } {
  const currentTotalValue = currentStock * currentPrice;
  const newTotalValue = capitalizedCost * quantity;
  const newStock = currentStock + quantity;
  const newProductionPrice = newStock > 0 ? (currentTotalValue + newTotalValue) / newStock : 0;
  return { newStock, newProductionPrice };
}

export interface ReconciledItemState {
  stock: number;
  productionPrice: number;
}

/**
 * Rebuilds an item's stock/cost after a purchase edit, reproducing the
 * original updatePurchase behavior exactly: subtract the old invoice lines
 * at their raw cost (floored at zero), then add the new lines at
 * capitalized cost. Rationale for the asymmetry is historical — the math is
 * intentionally unchanged; characterization tests pin it.
 */
export function reconcileItemState(
  currentStock: number,
  currentPrice: number,
  oldItems: ItemStateDelta[],
  newItems: ItemStateDelta[]
): ReconciledItemState {
  let stock = currentStock;
  let totalValue = currentStock * currentPrice;

  for (const oldItem of oldItems) {
    stock = Math.max(0, stock - oldItem.quantity);
    totalValue = Math.max(0, totalValue - oldItem.quantity * oldItem.cost);
  }

  for (const newItem of newItems) {
    stock += newItem.quantity;
    totalValue += newItem.quantity * newItem.cost;
  }

  return {
    stock,
    productionPrice: stock > 0 ? totalValue / stock : 0,
  };
}

export type SettlementWrite =
  | { kind: 'expense'; data: PurchaseExpenseData }
  | { kind: 'payable'; data: PurchasePayableData };

interface PurchaseExpenseData {
  expenseId: string;
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank';
  purchaseId: string;
}

interface PurchasePayableData {
  description: string;
  amount: number;
  status: 'Pending';
  type: 'Payable';
  purchaseId: string;
}

export interface SettlementPlan {
  writes: SettlementWrite[];
  lastExpenseNumber: number;
}

export interface SettlementInput {
  purchaseId: string;
  supplier: string;
  finalAmount: number;
  paymentMethod: PurchasePaymentMethod;
  amountPaid?: number;
  splitPaymentMethod?: 'Cash' | 'Bank';
  nextExpenseNumber: number;
}

/**
 * Plans the ledger writes a purchase settlement produces (expense for money
 * out now, payable for money owed). Dates are applied by the caller so this
 * stays pure and testable. Every emitted doc carries `purchaseId` so ledger
 * entries link back by exact field equality instead of description matching.
 */
export function planPurchaseSettlements(input: SettlementInput): SettlementPlan {
  const writes: SettlementWrite[] = [];
  let lastExpenseNumber = input.nextExpenseNumber;

  if (input.finalAmount <= 0) {
    return { writes, lastExpenseNumber };
  }

  if (input.paymentMethod === 'Cash' || input.paymentMethod === 'Bank') {
    lastExpenseNumber += 1;
    writes.push({
      kind: 'expense',
      data: {
        expenseId: `EXP-${String(lastExpenseNumber).padStart(4, '0')}`,
        description: `Payment for Purchase ${input.purchaseId}`,
        amount: input.finalAmount,
        paymentMethod: input.paymentMethod,
        purchaseId: input.purchaseId,
      },
    });
  } else if (input.paymentMethod === 'Split') {
    const amountPaid = input.amountPaid || 0;
    const payableAmount = input.finalAmount - amountPaid;

    if (amountPaid > 0) {
      lastExpenseNumber += 1;
      writes.push({
        kind: 'expense',
        data: {
          expenseId: `EXP-${String(lastExpenseNumber).padStart(4, '0')}`,
          description: `Partial payment for Purchase ${input.purchaseId}`,
          amount: amountPaid,
          paymentMethod: input.splitPaymentMethod || 'Cash',
          purchaseId: input.purchaseId,
        },
      });
    }

    if (payableAmount > 0) {
      writes.push({
        kind: 'payable',
        data: {
          description: `Balance for Purchase ${input.purchaseId} from ${input.supplier}`,
          amount: payableAmount,
          status: 'Pending',
          type: 'Payable',
          purchaseId: input.purchaseId,
        },
      });
    }
  } else if (input.paymentMethod === 'Due') {
    writes.push({
      kind: 'payable',
      data: {
        description: `Purchase ${input.purchaseId} from ${input.supplier}`,
        amount: input.finalAmount,
        status: 'Pending',
        type: 'Payable',
        purchaseId: input.purchaseId,
      },
    });
  }

  return { writes, lastExpenseNumber };
}
