'use server';

import type { Purchase } from '../types';
import {
  getPurchases as getPurchasesImpl,
  getPurchasesPaginated as getPurchasesPaginatedImpl,
} from './purchase-queries';
import { addPurchase as addPurchaseImpl } from './purchase-create';
import { updatePurchase as updatePurchaseImpl } from './purchase-update';

export async function getPurchases(userId: string): Promise<Purchase[]> {
  return getPurchasesImpl(userId);
}

export async function getPurchasesPaginated(params: {
  userId: string;
  pageLimit?: number;
  lastVisibleId?: string;
}): Promise<{ purchases: Purchase[]; hasMore: boolean }> {
  return getPurchasesPaginatedImpl(params);
}

export async function addPurchase(
  userId: string,
  data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: string }
) {
  return addPurchaseImpl(userId, data);
}

export async function updatePurchase(
  userId: string,
  purchaseDocId: string,
  data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: string }
) {
  return updatePurchaseImpl(userId, purchaseDocId, data);
}
