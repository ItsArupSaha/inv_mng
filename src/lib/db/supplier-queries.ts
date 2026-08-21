'use server';

import { db } from '../firebase';
import type { Expense, Purchase, PurchaseReturn, Transaction } from '../types';
import {
  buildSupplierLedgerEntries,
  buildSupplierSummaries,
  type SupplierLedgerEntry,
  type SupplierLedgerInput,
  type SupplierSummary
} from '../supplier-ledger';
import { getExpenses } from './expenses';
import { getPurchaseReturns } from './purchase-returns';
import { getTransactions } from './transaction-queries';
import { getPurchases } from './purchase-queries';

async function loadLedgerInput(userId: string): Promise<SupplierLedgerInput> {
  const [purchases, expenses, payables, returns] = await Promise.all([
    getPurchases(userId),
    getExpenses(userId),
    getTransactions(userId, 'Payable'),
    getPurchaseReturns(userId),
  ]);
  return {
    purchases: purchases as Purchase[],
    expenses: expenses as Expense[],
    payables: payables as Transaction[],
    returns: returns as PurchaseReturn[],
  };
}

export async function getSupplierSummaries(userId: string): Promise<SupplierSummary[]> {
  if (!db || !userId) return [];
  return buildSupplierSummaries(await loadLedgerInput(userId));
}

export async function getSupplierLedgerDetail(
  userId: string,
  supplier: string
): Promise<SupplierLedgerEntry[]> {
  if (!db || !userId) return [];
  return buildSupplierLedgerEntries(supplier, await loadLedgerInput(userId));
}
