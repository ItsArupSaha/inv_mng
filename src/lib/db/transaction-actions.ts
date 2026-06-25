'use server';

import type { Transaction } from '../types';
import {
  addTransaction as addTransactionImpl,
  recordTransfer as recordTransferImpl,
  updateTransactionStatus as updateTransactionStatusImpl,
  deleteTransaction as deleteTransactionImpl,
} from './transaction-actions-basic';

import {
  addPayment as addPaymentImpl,
  payPayable as payPayableImpl,
  refundCustomerOverpayment as refundCustomerOverpaymentImpl,
} from './transaction-actions-payments';

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
