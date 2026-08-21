import { getDocs, query, type DocumentData, type DocumentReference, type Transaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { ItemBatch, PurchaseItem } from '../types';
import { earlierExpiry, mergeBatchCost } from '../batch-allocation';
import { batchesCollectionRef, buildBatchData, newBatchDocRef } from './batch-utils';

type StagedBatch = {
  ref: DocumentReference<DocumentData>;
  data: ItemBatch;
  existed: boolean;
};

function resolveBatchNo(lineBatchNo: string | undefined, purchaseId: string): string {
  return (lineBatchNo || '').trim() || `AUTO-${purchaseId}`;
}

/**
 * Stages batch mutations for transactions that both withdraw and re-receive
 * purchase lines (purchase editing). Two Firestore constraints make naive
 * per-line writes wrong: delete followed by update on the same doc is rejected
 * with INVALID_ARGUMENT, and reads outside the transaction cannot see staged
 * writes, so merged quantities would be computed from stale committed state.
 * Every mutation is applied to this in-memory ledger instead and flushed once:
 * surviving batches get a single set/update, emptied ones a single delete.
 */
export class BatchWriteLedger {
  private entriesByItem = new Map<string, StagedBatch[]>();

  constructor(
    private userId: string,
    private transaction: Transaction
  ) {}

  async hasCommittedBatches(itemId: string): Promise<boolean> {
    return (await this.entries(itemId)).some((entry) => entry.existed);
  }

  async withdraw(itemId: string, purchaseId: string, line: PurchaseItem): Promise<void> {
    const entry = (await this.entries(itemId)).find(
      (e) => (e.data.batchNo || '') === resolveBatchNo(line.batchNo, purchaseId)
    );
    if (!entry) return;
    const remaining = Math.max(0, (Number(entry.data.quantity) || 0) - (Number(line.quantity) || 0));
    entry.data = { ...entry.data, quantity: remaining };
  }

  async receive(itemId: string, purchaseId: string, line: PurchaseItem, capitalizedCost: number): Promise<void> {
    const batchNo = resolveBatchNo(line.batchNo, purchaseId);
    const quantity = Number(line.quantity) || 0;
    const entries = await this.entries(itemId);
    const entry = entries.find((e) => (e.data.batchNo || '') === batchNo);

    if (entry) {
      const currentQty = Number(entry.data.quantity) || 0;
      const currentCost = Number(entry.data.cost) || 0;
      entry.data = {
        ...entry.data,
        quantity: currentQty + quantity,
        cost: mergeBatchCost(currentQty, currentCost, quantity, capitalizedCost),
        expiryDate: earlierExpiry(entry.data.expiryDate, line.expiryDate),
      };
    } else {
      entries.push({
        ref: newBatchDocRef(this.userId, itemId),
        existed: false,
        data: {
          batchNo,
          expiryDate: line.expiryDate ?? null,
          quantity,
          initialQuantity: quantity,
          cost: capitalizedCost,
          purchaseId,
        },
      });
    }
  }

  async totalQuantity(itemId: string): Promise<number> {
    return (await this.entries(itemId)).reduce(
      (sum, entry) => sum + Math.max(0, Number(entry.data.quantity) || 0),
      0
    );
  }

  flush(): void {
    for (const entries of this.entriesByItem.values()) {
      for (const entry of entries) {
        const quantity = Math.max(0, Number(entry.data.quantity) || 0);
        if (entry.existed) {
          if (quantity <= 0) {
            this.transaction.delete(entry.ref);
          } else {
            this.transaction.update(entry.ref, {
              quantity,
              cost: entry.data.cost,
              expiryDate: entry.data.expiryDate,
            });
          }
        } else if (quantity > 0) {
          this.transaction.set(entry.ref, buildBatchData(entry.data));
        }
      }
    }
  }

  private async entries(itemId: string): Promise<StagedBatch[]> {
    let entries = this.entriesByItem.get(itemId);
    if (!entries) {
      const snapshot = await getDocs(query(batchesCollectionRef(this.userId, itemId)));
      entries = snapshot.docs.map((d) => ({
        ref: d.ref,
        data: d.data() as ItemBatch,
        existed: true,
      }));
      this.entriesByItem.set(itemId, entries);
    }
    return entries;
  }
}
