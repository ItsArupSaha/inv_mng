

import type { Customer, Expense, Item, Purchase, Sale, SalesReturn, Transaction } from '../types';

// Helper to convert Firestore docs to our types
export function docToItem(d: any): Item {
  return { id: d.id, ...d.data() } as Item;
}
export function docToCustomer(d: any): Customer {
  return { id: d.id, ...d.data() } as Customer;
}
export function docToSale(d: any): Sale {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Sale;
}
export function docToSalesReturn(d: any): SalesReturn {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as SalesReturn;
}
export function docToPurchase(d: any): Purchase {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
        dueDate: data.dueDate.toDate().toISOString(),
    } as Purchase;
}
export function docToExpense(d: any): Expense {
    const data = d.data();
    return { 
        id: d.id, 
        expenseId: data.expenseId || `EXP-${String(d.id).slice(0, 8)}`, // Fallback for existing expenses
        ...data,
        date: data.date.toDate().toISOString(),
    } as Expense;
}
export function docToTransaction(d: any): Transaction {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        dueDate: data.dueDate.toDate().toISOString(),
    } as Transaction;
}
export function isOperatingExpense(description: string): boolean {
  const desc = description || '';
  if (desc.startsWith('Transfer to')) return false;
  if (desc.startsWith('Payment for Purchase')) return false;
  if (desc.startsWith('Partial payment for Purchase')) return false;
  if (desc.startsWith('Paid Payable:')) return false;
  if (desc.startsWith('Asset Purchase:')) return false;
  if (desc.startsWith('Customer Refund:')) return false;
  if (desc.startsWith('Supplier Refund:')) return false;
  return true;
}

/**
 * True for every expense doc that moves money to/from a supplier: purchase
 * payments, payable settlements, and supplier refunds (negative amounts).
 */
export function isSupplierPaymentExpense(description: string): boolean {
  const desc = description || '';
  return (
    desc.startsWith('Payment for Purchase') ||
    desc.startsWith('Partial payment for Purchase') ||
    desc.startsWith('Paid Payable:') ||
    desc.startsWith('Supplier Refund:')
  );
}
