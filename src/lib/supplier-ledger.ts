import type { Expense, Purchase, PurchaseReturn, Transaction } from './types';

/**
 * Links an expense or payable document back to its purchase. Every doc the
 * purchase pipeline writes carries `purchaseId`; older docs only encode it in
 * one of a handful of machine-generated description templates. The PUR number
 * pins the purchase, so any supplier suffix is accepted.
 */
export interface LedgerDocLike {
  purchaseId?: string;
  description?: string;
}

const LEGACY_EXACT_DESCRIPTIONS = (pid: string): string[] => [
  `Payment for Purchase ${pid}`,
  `Partial payment for Purchase ${pid}`,
];

const LEGACY_DESCRIPTION_PREFIXES = (pid: string): string[] => [
  `Purchase ${pid} from `,
  `Balance for Purchase ${pid} from `,
  `Paid Payable: Purchase ${pid} from `,
  `Paid Payable: Balance for Purchase ${pid} from `,
];

export function ledgerDocMatchesPurchase(doc: LedgerDocLike, pid: string): boolean {
  if (doc.purchaseId === pid) return true;
  const description = (doc.description || '').trim();
  if (!description) return false;
  if (LEGACY_EXACT_DESCRIPTIONS(pid).includes(description)) return true;
  return LEGACY_DESCRIPTION_PREFIXES(pid).some(prefix => description.startsWith(prefix));
}

export interface SupplierSummary {
  supplier: string;
  purchaseCount: number;
  totalPurchased: number; // sum of invoice final amounts
  totalReturned: number; // sum of purchase-return refund values
  totalPaid: number; // net money paid (cash/bank expenses incl. negative refunds)
  outstanding: number; // sum of still-pending payable amounts
  lastPurchaseDate: string | null;
}

export interface SupplierLedgerInput {
  purchases: Purchase[];
  expenses: Expense[];
  payables: Transaction[]; // type 'Payable' docs only
  returns: PurchaseReturn[];
}

function purchaseFinalAmount(purchase: Purchase): number {
  return (
    (Number(purchase.totalAmount) || 0) +
    (Number(purchase.vatAmount) || 0) -
    (Number(purchase.discountAmount) || 0)
  );
}

export function buildSupplierSummaries(input: SupplierLedgerInput): SupplierSummary[] {
  const bySupplier = new Map<string, SupplierSummary>();

  const ensure = (supplier: string): SupplierSummary => {
    const key = supplier.trim();
    let summary = bySupplier.get(key);
    if (!summary) {
      summary = {
        supplier: key,
        purchaseCount: 0,
        totalPurchased: 0,
        totalReturned: 0,
        totalPaid: 0,
        outstanding: 0,
        lastPurchaseDate: null,
      };
      bySupplier.set(key, summary);
    }
    return summary;
  };

  for (const purchase of input.purchases) {
    const summary = ensure(purchase.supplier);
    summary.purchaseCount += 1;
    summary.totalPurchased += purchaseFinalAmount(purchase);
    if (!summary.lastPurchaseDate || purchase.date > summary.lastPurchaseDate) {
      summary.lastPurchaseDate = purchase.date;
    }
  }

  for (const supplierReturn of input.returns) {
    ensure(supplierReturn.supplier).totalReturned += Number(supplierReturn.totalReturnValue) || 0;
  }

  for (const expense of input.expenses) {
    const purchase = input.purchases.find(p => ledgerDocMatchesPurchase(expense, p.purchaseId));
    if (purchase) {
      ensure(purchase.supplier).totalPaid += Number(expense.amount) || 0;
    }
  }

  for (const payable of input.payables) {
    if (payable.status !== 'Pending') continue;
    const purchase = input.purchases.find(p => ledgerDocMatchesPurchase(payable, p.purchaseId));
    const supplier = purchase ? purchase.supplier : payable.customerName?.trim() || '';
    if (supplier) {
      ensure(supplier).outstanding += Number(payable.amount) || 0;
    }
  }

  return Array.from(bySupplier.values()).sort((a, b) => b.totalPurchased - a.totalPurchased);
}

export type SupplierLedgerEntryType = 'purchase' | 'payment' | 'return';

export interface SupplierLedgerEntry {
  date: string;
  type: SupplierLedgerEntryType;
  reference: string;
  description: string;
  debit: number; // increases what the store owes the supplier
  credit: number; // reduces what the store owes the supplier
  balance: number; // running owed amount (debit - credit)
}

/**
 * Chronological statement for one supplier: purchases raise the balance,
 * payments and returns lower it. The closing balance equals the current
 * outstanding payable amount when every settlement is accounted for.
 */
export function buildSupplierLedgerEntries(supplier: string, input: SupplierLedgerInput): SupplierLedgerEntry[] {
  const key = supplier.trim();
  const drafts: Omit<SupplierLedgerEntry, 'balance'>[] = [];

  for (const purchase of input.purchases) {
    if (purchase.supplier.trim() !== key) continue;
    drafts.push({
      date: purchase.date,
      type: 'purchase',
      reference: purchase.purchaseId,
      description: purchase.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ') || 'Purchase',
      debit: purchaseFinalAmount(purchase),
      credit: 0,
    });
  }

  for (const expense of input.expenses) {
    const purchase = input.purchases.find(p => ledgerDocMatchesPurchase(expense, p.purchaseId));
    if (!purchase || purchase.supplier.trim() !== key) continue;
    drafts.push({
      date: expense.date,
      type: 'payment',
      reference: expense.expenseId,
      description: expense.description,
      debit: 0,
      credit: Number(expense.amount) || 0, // negative when the expense is a refund received
    });
  }

  for (const supplierReturn of input.returns) {
    if (supplierReturn.supplier.trim() !== key) continue;
    drafts.push({
      date: supplierReturn.date,
      type: 'return',
      reference: supplierReturn.returnId,
      description: supplierReturn.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ') || 'Return',
      debit: 0,
      credit: Number(supplierReturn.totalReturnValue) || 0,
    });
  }

  drafts.sort((a, b) => (a.date === b.date ? a.reference.localeCompare(b.reference) : a.date.localeCompare(b.date)));

  let running = 0;
  return drafts.map(entry => {
    running += entry.debit - entry.credit;
    return { ...entry, balance: running };
  });
}
