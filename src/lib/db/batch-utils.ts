import { collection, doc, getDocs, orderBy, query, Timestamp, type Transaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { ItemBatch, PurchaseItem } from '../types';
import { earlierExpiry, mergeBatchCost } from '../batch-allocation';

export type ItemBatchWithId = ItemBatch & { id: string };

export function batchesCollectionRef(userId: string, itemId: string) {
  return collection(db!, 'users', userId, 'items', itemId, 'batches');
}

export function batchDocRef(userId: string, itemId: string, batchId: string) {
  return doc(db!, 'users', userId, 'items', itemId, 'batches', batchId);
}

export function newBatchDocRef(userId: string, itemId: string) {
  return doc(batchesCollectionRef(userId, itemId));
}

export async function fetchItemBatches(userId: string, itemId: string): Promise<ItemBatchWithId[]> {
  const snapshot = await getDocs(query(batchesCollectionRef(userId, itemId), orderBy('batchNo')));
  return snapshot.docs.map(d => ({ ...(d.data() as ItemBatch), id: d.id }));
}

export function buildBatchData(batch: Omit<ItemBatch, 'createdAt'>): ItemBatch {
  return { ...batch, createdAt: Timestamp.now() };
}

/**
 * Receives a purchase line into the item's batches inside the caller's
 * transaction: merges quantity and weighted-average cost when the batch
 * number already exists, otherwise creates the batch record.
 */
export async function receivePurchaseBatch(
  userId: string,
  transaction: Transaction,
  itemId: string,
  purchaseId: string,
  line: PurchaseItem,
  capitalizedCost: number
): Promise<void> {
  const batchNo = (line.batchNo || '').trim() || `AUTO-${purchaseId}`;
  const quantity = Number(line.quantity) || 0;

  const snapshot = await getDocs(query(batchesCollectionRef(userId, itemId)));
  const existing = snapshot.docs.find(d => (d.data().batchNo || '') === batchNo);

  if (existing) {
    const data = existing.data() as ItemBatch;
    const currentQty = Number(data.quantity) || 0;
    const currentCost = Number(data.cost) || 0;
    const newQty = currentQty + quantity;
    transaction.update(existing.ref, {
      quantity: newQty,
      cost: mergeBatchCost(currentQty, currentCost, quantity, capitalizedCost),
      expiryDate: earlierExpiry(data.expiryDate, line.expiryDate),
    });
  } else {
    transaction.set(newBatchDocRef(userId, itemId), buildBatchData({
      batchNo,
      expiryDate: line.expiryDate ?? null,
      quantity,
      initialQuantity: quantity,
      cost: capitalizedCost,
      purchaseId,
    }));
  }
}

/**
 * Removes a purchase line's quantity from the batch(es) this purchase
 * received (matched by batch number), flooring at zero — used when a
 * purchase is edited and old lines must be taken back out.
 */
export async function withdrawPurchaseBatch(
  userId: string,
  transaction: Transaction,
  itemId: string,
  purchaseId: string,
  line: PurchaseItem
): Promise<void> {
  const batchNo = (line.batchNo || '').trim() || `AUTO-${purchaseId}`;
  const quantity = Number(line.quantity) || 0;
  if (quantity <= 0) return;

  const snapshot = await getDocs(query(batchesCollectionRef(userId, itemId)));
  const target = snapshot.docs.find(d => (d.data().batchNo || '') === batchNo);
  if (!target) return;

  const remaining = Math.max(0, (Number(target.data().quantity) || 0) - quantity);
  if (remaining === 0 && (Number(target.data().initialQuantity) || 0) > 0) {
    transaction.delete(target.ref);
  } else {
    transaction.update(target.ref, { quantity: remaining });
  }
}
