'use server';

import type { Transaction, Transfer } from '../types';
import {
  getTransactions as getTransactionsImpl,
  getTransactionsPaginated as getTransactionsPaginatedImpl,
  getPaidReceivablesForDateRange as getPaidReceivablesForDateRangeImpl,
  getTransactionsForCustomer as getTransactionsForCustomerImpl,
  getSaleTransaction as getSaleTransactionImpl,
  getTransfersPaginated as getTransfersPaginatedImpl,
  getTransactionsForMonth as getTransactionsForMonthImpl,
  getPaidPayables as getPaidPayablesImpl,
  getPaidPayablesForDateRange as getPaidPayablesForDateRangeImpl,
} from './transaction-queries';

import {
  addTransaction as addTransactionImpl,
  recordTransfer as recordTransferImpl,
  updateTransactionStatus as updateTransactionStatusImpl,
  deleteTransaction as deleteTransactionImpl,
  addPayment as addPaymentImpl,
  payPayable as payPayableImpl,
  refundCustomerOverpayment as refundCustomerOverpaymentImpl,
} from './transaction-actions';

export async function getTransactions(userId: string, type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
  return getTransactionsImpl(userId, type);
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

export async function getTransfersPaginated(params: {
  userId: string;
  pageLimit?: number;
  lastVisibleId?: string;
}): Promise<{ transfers: Transfer[]; hasMore: boolean }> {
  return getTransfersPaginatedImpl(params);
}

export async function getTransactionsForMonth(userId: string, year: number, month: number): Promise<Transaction[]> {
  return getTransactionsForMonthImpl(userId, year, month);
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

export async function recordTransfer(
  userId: string,
  data: {
    amount: number;
    from: 'Cash' | 'Bank';
    to: 'Cash' | 'Bank';
    date: Date;
  }
) {
  return recordTransferImpl(userId, data);
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
