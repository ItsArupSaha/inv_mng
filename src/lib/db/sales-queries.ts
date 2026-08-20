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
import type { Sale } from '../types';
import { isFuzzyMatch } from '../search-utils';
import { docToSale } from './utils';

// --- Sales Actions ---
export async function getSales(userId: string): Promise<Sale[]> {
  if (!db || !userId) return [];
  const salesCollection = collection(db, 'users', userId, 'sales');
  const snapshot = await getDocs(query(salesCollection, orderBy('date', 'desc')));
  return snapshot.docs.map(docToSale);
}

export async function getSalesPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ sales: Sale[], hasMore: boolean }> {
  if (!db || !userId) return { sales: [], hasMore: false };

  const salesCollection = collection(db, 'users', userId, 'sales');
  let q = query(
    salesCollection,
    orderBy('date', 'desc'),
    limit(pageLimit)
  );

  if (lastVisibleId) {
    const lastVisibleDoc = await getDoc(doc(salesCollection, lastVisibleId));
    if (lastVisibleDoc.exists()) {
      q = query(q, startAfter(lastVisibleDoc));
    }
  }

  const snapshot = await getDocs(q);
  const sales = snapshot.docs.map(docToSale);

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if (lastDoc) {
    const nextQuery = query(salesCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { sales, hasMore };
}

export async function getSalesForCustomer(userId: string, customerId: string): Promise<Sale[]> {
  if (!db || !userId) return [];
  const salesCollection = collection(db, 'users', userId, 'sales');
  const snapshot = await getDocs(
    query(salesCollection, where('customerId', '==', customerId), orderBy('date', 'desc'))
  );
  return snapshot.docs.map(docToSale);
}

export async function getSalesForDateRange(userId: string, startDate: Date, endDate: Date): Promise<Sale[]> {
  if (!db || !userId) return [];
  const salesCollection = collection(db, 'users', userId, 'sales');
  const q = query(
    salesCollection,
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToSale);
}

export async function getSalesForMonth(userId: string, year: number, month: number, offsetMinutes?: number): Promise<Sale[]> {
  if (offsetMinutes !== undefined) {
    let startMs = Date.UTC(year, month, 1, 0, 0, 0, 0);
    let endMs = Date.UTC(year, month + 1, 0, 23, 59, 59, 999);
    startMs += offsetMinutes * 60 * 1000;
    endMs += offsetMinutes * 60 * 1000;
    return getSalesForDateRange(userId, new Date(startMs), new Date(endMs));
  }
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return getSalesForDateRange(userId, startDate, endDate);
}

export async function getSalesForDay(userId: string, dateString: string, offsetMinutes?: number): Promise<Sale[]> {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (offsetMinutes !== undefined) {
    let startMs = Date.UTC(year, month, day, 0, 0, 0, 0);
    let endMs = Date.UTC(year, month, day, 23, 59, 59, 999);
    startMs += offsetMinutes * 60 * 1000;
    endMs += offsetMinutes * 60 * 1000;
    return getSalesForDateRange(userId, new Date(startMs), new Date(endMs));
  }

  const startDate = new Date(year, month, day, 0, 0, 0, 0);
  const endDate = new Date(year, month, day, 23, 59, 59, 999);
  return getSalesForDateRange(userId, startDate, endDate);
}

export async function searchSales(userId: string, searchTerm: string): Promise<Sale[]> {
  if (!db || !userId || !searchTerm) return [];

  const searchLower = searchTerm.toLowerCase();

  // 1. Fuzzy-match customers by name
  const customersCollection = collection(db, 'users', userId, 'customers');
  const customersSnapshot = await getDocs(customersCollection);
  const matchingCustomerIds = customersSnapshot.docs
    .filter(doc => {
      const name = (doc.data().name || '').toLowerCase();
      return name.includes(searchLower) || isFuzzyMatch(doc.data().name, searchLower);
    })
    .map(doc => doc.id);

  // 2. Fuzzy-match medicines so sales can be found by item name/typo
  const itemsSnapshot = await getDocs(collection(db, 'users', userId, 'items'));
  const matchingItemIds = new Set(
    itemsSnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return (
          isFuzzyMatch(data.title, searchLower) ||
          isFuzzyMatch(data.medicineGroup, searchLower) ||
          isFuzzyMatch(data.company, searchLower)
        );
      })
      .map(doc => doc.id)
  );

  // 3. Fetch all sales to perform in-memory filtering
  const salesCollection = collection(db, 'users', userId, 'sales');
  const salesSnapshot = await getDocs(query(salesCollection, orderBy('date', 'desc')));
  const allSales = salesSnapshot.docs.map(docToSale);

  // 4. Filter: sale id, customer name, or any line item's medicine
  return allSales.filter(sale => {
    const matchesSaleId = sale.saleId.toLowerCase().includes(searchLower);
    const matchesCustomer = matchingCustomerIds.includes(sale.customerId);
    const matchesItem = sale.items.some(item => matchingItemIds.has(item.itemId));
    return matchesSaleId || matchesCustomer || matchesItem;
  });
}
