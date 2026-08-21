'use server';

import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { buildScheduledRegisterRows, type ScheduledRegisterRow } from '../scheduled-register';
import { getItems } from './items';
import { getCustomers } from './customers';
import { docToSale } from './utils';
import type { Sale } from '../types';

export async function getScheduledRegister(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ScheduledRegisterRow[]> {
  if (!db || !userId) return [];

  const salesQuery = query(
    collection(db, 'users', userId, 'sales'),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate))
  );

  const [salesSnap, allItems, allCustomers] = await Promise.all([
    getDocs(salesQuery).catch(() => ({ docs: [] as any[] })),
    getItems(userId),
    getCustomers(userId),
  ]);

  const sales: Sale[] = salesSnap.docs.map(docToSale);
  const itemsById = new Map(allItems.map((item) => [item.id, item]));
  const customersById = new Map(allCustomers.map((customer) => [customer.id, customer]));

  return buildScheduledRegisterRows(sales, itemsById, customersById);
}
