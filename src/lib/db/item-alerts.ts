'use server';

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { resolveIsSalable } from '../item-flags';

// Firestore allows at most one range-filtered field per query, so these
// counters filter on the narrowest field server-side (expiry or stock) and
// apply the remaining checks client-side. Reads stay bounded to the matched
// subset instead of streaming the whole catalog for two badge numbers.

function isoDateFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function countExpiringItems(userId: string, withinDays: number): Promise<number> {
  if (!db || !userId) return 0;
  const itemsRef = collection(db, 'users', userId, 'items');
  const snapshot = await getDocs(query(itemsRef, where('expiryDate', '<=', isoDateFromToday(withinDays))));
  return snapshot.docs.filter((d) => {
    const data = d.data();
    return typeof data.expiryDate === 'string' && data.stock > 0;
  }).length;
}

export async function countLowStockSalableItems(userId: string): Promise<number> {
  if (!db || !userId) return 0;
  const itemsRef = collection(db, 'users', userId, 'items');
  const snapshot = await getDocs(query(itemsRef, where('stock', '<', 1)));
  return snapshot.docs.filter((d) => {
    const data = d.data();
    return resolveIsSalable({ isSalable: data.isSalable, categoryName: data.categoryName });
  }).length;
}
