// Server-side sale input guards (M3): the browser is never trusted for
// money math. Pure functions so they are unit-testable without a database.

export interface GuardItem {
  itemId: string;
  quantity: number;
}

export type DiscountShape =
  | { type: 'none' }
  | { type: 'percentage'; value: number }
  | { type: 'amount'; value: number };

/** Every line: real item id and a positive whole quantity. */
export function validateSaleItems(items: GuardItem[]): string | null {
  for (const item of items) {
    if (!item.itemId) return 'Every sale line needs a medicine selected.';
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return `Quantity must be a whole number of at least 1 (got ${item.quantity}).`;
    }
  }
  return null;
}

/** Discount within sane bounds against the server-computed subtotal. */
export function validateDiscount(discount: DiscountShape, subtotal: number): string | null {
  if (discount.type === 'percentage') {
    if (!(discount.value >= 0) || discount.value > 100) {
      return 'Percentage discount must be between 0 and 100.';
    }
  } else if (discount.type === 'amount') {
    if (!(discount.value >= 0) || discount.value > subtotal) {
      return 'Amount discount cannot be negative or exceed the sale total.';
    }
  }
  return null;
}

/** Split part-payment never exceeds the bill. */
export function validateAmountPaid(amountPaid: number | undefined, total: number): string | null {
  if (amountPaid === undefined) return null;
  if (!(amountPaid >= 0)) return 'Amount paid cannot be negative.';
  if (amountPaid > total) return 'Amount paid cannot exceed the sale total.';
  return null;
}

/** Credit applied can never exceed the advance the customer actually has. */
export function validateCreditApplied(creditApplied: number, customerDueBalance: number): string | null {
  if (!(creditApplied >= 0)) return 'Credit applied cannot be negative.';
  const availableAdvance = Math.max(0, -(Number(customerDueBalance) || 0));
  if (creditApplied > availableAdvance) {
    return 'Credit applied exceeds the advance this customer actually has.';
  }
  return null;
}
