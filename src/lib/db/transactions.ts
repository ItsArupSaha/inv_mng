'use server';

import type { Transaction } from '../types';
import {
  getTransactions as getTransactionsImpl,
  getTransactionsPaginated as getTransactionsPaginatedImpl,
  getPaidReceivablesForDateRange as getPaidReceivablesForDateRangeImpl,
  getTransactionsForCustomer as getTransactionsForCustomerImpl,
  getSaleTransaction as getSaleTransactionImpl,
  getTransactionsForMonth as getTransactionsForMonthImpl,
  getTransactionsForDay as getTransactionsForDayImpl,
  getPaidPayables as getPaidPayablesImpl,
  getPaidPayablesForDateRange as getPaidPayablesForDateRangeImpl,
} from './transaction-queries';

import {
  addTransaction as addTransactionImpl,
  updateTransactionStatus as updateTransactionStatusImpl,
  deleteTransaction as deleteTransactionImpl,
  addPayment as addPaymentImpl,
  payPayable as payPayableImpl,
  refundCustomerOverpayment as refundCustomerOverpaymentImpl,
} from './transaction-actions';
import { cachedCollection } from './collection-cache';
import { readLedgerVersion } from './data-version';

export async function getTransactions(userId: string, type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
  if (!userId) return [];
  const version = await readLedgerVersion(userId);
  // Cached per type and guarded by the ledger version: mutations evict the
  // family locally, and the version check covers other server instances.
  return cachedCollection(`transactions:${type}`, userId, () => getTransactionsImpl(userId, type), { version });
}

export async function getTransactionsPaginated(params: {
  userId: string;
  type: 'Receivable' | 'Payable';
  pageLimit?: number;
  lastVisibleId?: string;
}): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
  return getTransactionsPaginatedImpl(params);
}

export async function getPaidReceivablesForDateRange(userId: string, fromDate: Date, toDate?: Date): Promise<Transaction[]> {
  return getPaidReceivablesForDateRangeImpl(userId, fromDate, toDate);
}

export async function getTransactionsForCustomer(
  userId: string,
  customerId: string,
  type: 'Receivable' | 'Payable',
  options: { excludeSaleDues?: boolean } = {}
): Promise<Transaction[]> {
  return getTransactionsForCustomerImpl(userId, customerId, type, options);
}

export async function getSaleTransaction(userId: string, saleId: string): Promise<Transaction | null> {
  return getSaleTransactionImpl(userId, saleId);
}

export async function getTransactionsForMonth(userId: string, year: number, month: number, offsetMinutes?: number): Promise<Transaction[]> {
  return getTransactionsForMonthImpl(userId, year, month, offsetMinutes);
}

export async function getTransactionsForDay(userId: string, dateString: string, offsetMinutes?: number): Promise<Transaction[]> {
  return getTransactionsForDayImpl(userId, dateString, offsetMinutes);
}

export async function getPaidPayables(userId: string): Promise<Transaction[]> {
  return getPaidPayablesImpl(userId);
}

export async function getPaidPayablesForDateRange(userId: string, fromDate: Date, toDate?: Date): Promise<Transaction[]> {
  return getPaidPayablesForDateRangeImpl(userId, fromDate, toDate);
}

export async function addTransaction(
  userId: string,
  data: Omit<Transaction, 'id' | 'dueDate' | 'status'> & { dueDate: Date }
): Promise<Transaction> {
  return addTransactionImpl(userId, data);
}

export async function updateTransactionStatus(
  userId: string,
  id: string,
  status: 'Pending' | 'Paid',
  type: 'Receivable' | 'Payable'
) {
  return updateTransactionStatusImpl(userId, id, status, type);
}

export async function deleteTransaction(userId: string, id: string, type: 'Receivable' | 'Payable') {
  return deleteTransactionImpl(userId, id, type);
}

export async function addPayment(
  userId: string,
  data: { customerId: string; amount: number; paymentMethod: 'Cash' | 'Bank' }
) {
  return addPaymentImpl(userId, data);
}

export async function payPayable(
  userId: string,
  data: { transactionId: string; amount: number; paymentMethod: 'Cash' | 'Bank' }
) {
  return payPayableImpl(userId, data);
}

export async function refundCustomerOverpayment(
  userId: string,
  data: { customerId: string; amount: number; paymentMethod: 'Cash' | 'Bank' }
) {
  return refundCustomerOverpaymentImpl(userId, data);
}
