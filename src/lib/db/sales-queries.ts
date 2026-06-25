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

export async function getSalesForMonth(userId: string, year: number, month: number): Promise<Sale[]> {
  if (!db || !userId) return [];
  const salesCollection = collection(db, 'users', userId, 'sales');
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const q = query(
    salesCollection,
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToSale);
}

export async function searchSales(userId: string, searchTerm: string): Promise<Sale[]> {
  if (!db || !userId || !searchTerm) return [];

  const searchLower = searchTerm.toLowerCase();

  // 1. Fetch matching customers first
  const customersCollection = collection(db, 'users', userId, 'customers');
  const customersSnapshot = await getDocs(customersCollection);
  const matchingCustomerIds = customersSnapshot.docs
    .filter(doc => doc.data().name.toLowerCase().includes(searchLower))
    .map(doc => doc.id);

  // 2. Fetch all sales to perform fuzzy in-memory filtering
  const salesCollection = collection(db, 'users', userId, 'sales');
  const salesSnapshot = await getDocs(query(salesCollection, orderBy('date', 'desc')));
  const allSales = salesSnapshot.docs.map(docToSale);

  // 3. Filter based on saleId OR customerId match
  return allSales.filter(sale => {
    const matchesSaleId = sale.saleId.toLowerCase().includes(searchLower);
    const matchesCustomer = matchingCustomerIds.includes(sale.customerId);
    return matchesSaleId || matchesCustomer;
  });
}
