'use server';

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Transaction } from '../types';

export async function addTransaction(userId: string, data: Omit<Transaction, 'id' | 'dueDate' | 'status'> & { dueDate: Date }): Promise<Transaction> {
  if (!db || !userId) throw new Error("Database not connected");
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  const transactionData = {
    ...data,
    status: 'Pending' as const,
    dueDate: Timestamp.fromDate(data.dueDate),
  };
  const newDocRef = await addDoc(transactionsCollection, transactionData);
  revalidatePath(`/${data.type.toLowerCase()}s`);
  revalidatePath('/dashboard');
  if (data.customerId) {
    revalidatePath(`/customers/${data.customerId}`);
  }
  return { ...transactionData, id: newDocRef.id, dueDate: data.dueDate.toISOString() };
}

export async function recordTransfer(
  userId: string,
  data: {
    amount: number;
    from: 'Cash' | 'Bank';
    to: 'Cash' | 'Bank';
    date: Date
  }
) {
  if (!db || !userId) throw new Error("Database not connected");
  if (data.from === data.to) throw new Error("Source and destination cannot be the same.");

  const transfersCollection = collection(db, 'users', userId, 'transfers');

  const transferData = {
    amount: data.amount,
    from: data.from,
    to: data.to,
    date: Timestamp.fromDate(data.date),
    description: `Transfer from ${data.from} to ${data.to}`
  };

  await addDoc(transfersCollection, transferData);

  revalidatePath('/dashboard');
}

export async function updateTransactionStatus(userId: string, id: string, status: 'Pending' | 'Paid', type: 'Receivable' | 'Payable') {
  if (!db || !userId) return;
  const transRef = doc(db, 'users', userId, 'transactions', id);
  const transDoc = await getDoc(transRef);

  await updateDoc(transRef, { status });

  revalidatePath(`/${type.toLowerCase()}s`);
  revalidatePath('/dashboard');
  if (transDoc.exists()) {
    const customerId = transDoc.data().customerId;
    if (customerId) {
      revalidatePath(`/customers/${customerId}`);
      revalidatePath('/receivables');
    }
  }
}

export async function deleteTransaction(userId: string, id: string, type: 'Receivable' | 'Payable') {
  if (!db || !userId) return;
  const transRef = doc(db, 'users', userId, 'transactions', id);
  await deleteDoc(transRef);
  revalidatePath(`/${type.toLowerCase()}s`);
  revalidatePath('/dashboard');
}
