'use server';

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Transaction, Transfer } from '../types';
import { getCustomerById } from './customers';
import { docToTransaction, docToTransfer } from './utils';

// --- Transactions (Receivables/Payables) Actions ---
export async function getTransactions(userId: string, type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  const q = query(transactionsCollection, where('type', '==', type), where('status', '==', 'Pending'));
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(docToTransaction);
  // Sort in application code to avoid needing a composite index
  return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function getTransactionsPaginated({ userId, type, pageLimit = 5, lastVisibleId }: { userId: string, type: 'Receivable' | 'Payable', pageLimit?: number, lastVisibleId?: string }): Promise<{ transactions: Transaction[], hasMore: boolean }> {
  if (!db || !userId) return { transactions: [], hasMore: false };
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  let q = query(
    transactionsCollection,
    where('type', '==', type),
    where('status', '==', 'Pending'),
    // orderBy('dueDate', 'desc'), // Removing order to prevent needing a composite index
    limit(pageLimit)
  );

  if (lastVisibleId) {
    const lastVisibleDoc = await getDoc(doc(transactionsCollection, lastVisibleId));
    if (lastVisibleDoc.exists()) {
      q = query(q, startAfter(lastVisibleDoc));
    }
  }
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(docToTransaction)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if (lastDoc) {
    const nextQuery = query(
      transactionsCollection,
      where('type', '==', type),
      where('status', '==', 'Pending'),
      // orderBy('dueDate', 'desc'),
      startAfter(lastDoc),
      limit(1)
    );
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { transactions, hasMore };
}

export async function getPaidReceivablesForDateRange(userId: string, fromDate: Date, toDate?: Date): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');

  const finalToDate = new Date(toDate || fromDate);
  finalToDate.setHours(23, 59, 59, 999);

  // First get all paid receivables, then filter by date in application code
  const q = query(
    transactionsCollection,
    where('type', '==', 'Receivable'),
    where('status', '==', 'Paid')
  );

  const snapshot = await getDocs(q);
  const allTransactions = snapshot.docs.map(docToTransaction);

  // Filter by date range in application code to avoid composite index requirement
  const filteredTransactions = allTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.dueDate);
    // Exclude: explicitly hidden records AND original sale receivables (have saleId but no paymentMethod).
    // Old records may lack isHiddenFromHistory even though they should be hidden — saleId is the reliable signal.
    const isHidden = (transaction as any).isHiddenFromHistory || (transaction as any).saleId;
    return !isHidden && transactionDate >= fromDate && transactionDate <= finalToDate;
  });

  const transactions = await Promise.all(filteredTransactions.map(async (transaction) => {
    if (transaction.customerId) {
      const customer = await getCustomerById(userId, transaction.customerId);
      return { ...transaction, customerName: customer?.name || 'Unknown' };
    }
    return transaction;
  }));

  return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function getTransactionsForCustomer(
  userId: string,
  customerId: string,
  type: 'Receivable' | 'Payable',
  options: { excludeSaleDues?: boolean } = {}
): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  let qConstraints: any[] = [
    where('type', '==', type),
    where('customerId', '==', customerId)
  ];

  if (options.excludeSaleDues) {
    // This is a workaround for Firestore's lack of 'not-starts-with'
    // It assumes sale descriptions always start with "Due from Sale #"
    qConstraints.push(where('description', '>=', 'Payment from customer'));
  }

  const q = query(
    transactionsCollection,
    ...qConstraints
  );

  const snapshot = await getDocs(q);
  let transactions = snapshot.docs.map(docToTransaction);

  return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function getSaleTransaction(userId: string, saleId: string): Promise<Transaction | null> {
  if (!db || !userId) return null;
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  const q = query(
    transactionsCollection,
    where('saleId', '==', saleId),
    where('type', '==', 'Receivable'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return docToTransaction(snapshot.docs[0]);
}

export async function getTransfersPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ transfers: Transfer[], hasMore: boolean }> {
  if (!db || !userId) return { transfers: [], hasMore: false };

  const transfersCollection = collection(db, 'users', userId, 'transfers');
  let q = query(
    transfersCollection,
    orderBy('date', 'desc'),
    limit(pageLimit)
  );

  if (lastVisibleId) {
    const lastVisibleDoc = await getDoc(doc(transfersCollection, lastVisibleId));
    if (lastVisibleDoc.exists()) {
      q = query(q, startAfter(lastVisibleDoc));
    }
  }

  const snapshot = await getDocs(q);
  const transfers = snapshot.docs.map(docToTransfer);

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if (lastDoc) {
    const nextQuery = query(transfersCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { transfers, hasMore };
}

export async function getTransactionsForMonth(userId: string, year: number, month: number): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const q = query(
    transactionsCollection,
    where('dueDate', '>=', Timestamp.fromDate(startDate)),
    where('dueDate', '<=', Timestamp.fromDate(endDate))
  );
  const snapshot = await getDocs(q);
  // Sort by dueDate in application code to avoid needing a composite index
  return snapshot.docs
    .map(docToTransaction)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

/**
 * Get all paid payables.
 * Returns payables that have been marked as 'Paid', ordered by dueDate descending.
 */
export async function getPaidPayables(userId: string): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  const q = query(
    transactionsCollection,
    where('type', '==', 'Payable'),
    where('status', '==', 'Paid')
  );
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(docToTransaction);

  // Filter out duplicates (original transactions that were fully paid using the new system)
  const visibleTransactions = transactions.filter((t: any) => !t.isHiddenFromHistory);

  // Sort in application code to avoid needing a composite index
  return visibleTransactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

/**
 * Get paid payables within a specific date range.
 * Returns payables that have been marked as 'Paid' and fall within the date range, ordered by dueDate descending.
 */
export async function getPaidPayablesForDateRange(userId: string, fromDate: Date, toDate?: Date): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');

  const finalToDate = toDate ? new Date(toDate) : new Date(fromDate);
  finalToDate.setHours(23, 59, 59, 999);

  // Get all paid payables, then filter by date in application code
  const q = query(
    transactionsCollection,
    where('type', '==', 'Payable'),
    where('status', '==', 'Paid')
  );

  const snapshot = await getDocs(q);
  const allTransactions = snapshot.docs.map(docToTransaction);

  // Filter by date range in application code to avoid composite index requirement
  const filteredTransactions = allTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.dueDate);
    const isVisible = !(transaction as any).isHiddenFromHistory;
    return transactionDate >= fromDate && transactionDate <= finalToDate && isVisible;
  });

  return filteredTransactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}
