import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Transaction } from '../types';
import { invalidateAppData } from './data-version';

export async function addTransaction(userId: string, data: Omit<Transaction, 'id' | 'dueDate' | 'status'> & { dueDate: Date }): Promise<Transaction> {
  if (!db || !userId) throw new Error("Database not connected");
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  const transactionData = {
    ...data,
    status: 'Pending' as const,
    dueDate: Timestamp.fromDate(data.dueDate),
  };
  const newDocRef = await addDoc(transactionsCollection, transactionData);
  await invalidateAppData(userId, { scope: 'ledger' });
  if (data.customerId) {
  }
  return { ...transactionData, id: newDocRef.id, dueDate: data.dueDate.toISOString() };
}

export async function updateTransactionStatus(userId: string, id: string, status: 'Pending' | 'Paid', type: 'Receivable' | 'Payable') {
  if (!db || !userId) return;
  const transRef = doc(db, 'users', userId, 'transactions', id);
  const transDoc = await getDoc(transRef);

  await updateDoc(transRef, { status });

  await invalidateAppData(userId, { scope: 'ledger' });
  if (transDoc.exists()) {
    const customerId = transDoc.data().customerId;
    if (customerId) {
    }
  }
}

export async function deleteTransaction(userId: string, id: string, type: 'Receivable' | 'Payable') {
  if (!db || !userId) return;
  const transRef = doc(db, 'users', userId, 'transactions', id);
  await deleteDoc(transRef);
  await invalidateAppData(userId, { scope: 'ledger' });
}
