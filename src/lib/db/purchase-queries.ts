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
import type { Purchase } from '../types';
import { docToPurchase } from './utils';

// --- Purchases Actions ---
export async function getPurchases(userId: string): Promise<Purchase[]> {
    if (!db || !userId) return [];
    const purchasesCollection = collection(db, 'users', userId, 'purchases');
    const snapshot = await getDocs(query(purchasesCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(docToPurchase);
}

export async function getPurchasesForDateRange(userId: string, startDate: Date, endDate: Date): Promise<Purchase[]> {
    if (!db || !userId) return [];
    const purchasesCollection = collection(db, 'users', userId, 'purchases');
    const q = query(
        purchasesCollection,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToPurchase);
}

export async function getPurchasesForMonth(userId: string, year: number, month: number, offsetMinutes?: number): Promise<Purchase[]> {
    if (offsetMinutes !== undefined) {
        let startMs = Date.UTC(year, month, 1, 0, 0, 0, 0);
        let endMs = Date.UTC(year, month + 1, 0, 23, 59, 59, 999);
        startMs += offsetMinutes * 60 * 1000;
        endMs += offsetMinutes * 60 * 1000;
        return getPurchasesForDateRange(userId, new Date(startMs), new Date(endMs));
    }
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return getPurchasesForDateRange(userId, startDate, endDate);
}

export async function getPurchasesForDay(userId: string, dateString: string, offsetMinutes?: number): Promise<Purchase[]> {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    if (offsetMinutes !== undefined) {
        let startMs = Date.UTC(year, month, day, 0, 0, 0, 0);
        let endMs = Date.UTC(year, month, day, 23, 59, 59, 999);
        startMs += offsetMinutes * 60 * 1000;
        endMs += offsetMinutes * 60 * 1000;
        return getPurchasesForDateRange(userId, new Date(startMs), new Date(endMs));
    }

    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    const endDate = new Date(year, month, day, 23, 59, 59, 999);
    return getPurchasesForDateRange(userId, startDate, endDate);
}

export async function getPurchasesPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ purchases: Purchase[], hasMore: boolean }> {
  if (!db || !userId) return { purchases: [], hasMore: false };

  const purchasesCollection = collection(db, 'users', userId, 'purchases');
  let q = query(
      purchasesCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(purchasesCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const purchases = snapshot.docs.map(docToPurchase);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(purchasesCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { purchases, hasMore };
}
