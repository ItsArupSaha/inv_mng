'use server';

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Metadata, Purchase, PurchaseReturn, PurchaseReturnItem, Transaction } from '../types';
import type { AllocatableBatch } from '../batch-allocation';
import { fetchItemBatches } from './batch-utils';
import {
  computeRefundTotal,
  planDueAdjustment,
  remainingReturnableQuantities,
  type RefundLineInput
} from '../purchase-return-math';
import { ledgerDocMatchesPurchase } from '../supplier-ledger';
import { invalidateLedgerCaches } from './collection-cache';
import { invalidateItemsCatalog } from './catalog-version';

export async function getPurchaseReturns(userId: string): Promise<PurchaseReturn[]> {
  if (!db || !userId) return [];
  const snapshot = await getDocs(
    query(collection(db, 'users', userId, 'purchase_returns'), orderBy('date', 'desc'))
  );
  return snapshot.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, date: data.date.toDate().toISOString() } as PurchaseReturn;
  });
}

interface CreatePurchaseReturnInput {
  purchaseDocId: string;
  lines: RefundLineInput[];
  refundMethod: 'Cash' | 'Bank' | 'Due';
}

/**
 * Sends purchased goods back to the supplier: stock leaves the batches this
 * purchase received (falling back to other batches when those were already
 * sold), the money comes back as cash/bank or is adjusted against the
 * supplier's pending payables.
 */
export async function addPurchaseReturn(userId: string, data: CreatePurchaseReturnInput) {
  if (!db || !userId || !data.purchaseDocId) {
    return { success: false as const, error: 'Database not connected or invalid purchase.' };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const purchasesCollection = collection(userRef, 'purchases');
    const purchaseRef = doc(purchasesCollection, data.purchaseDocId);
    const purchaseSnap = await getDoc(purchaseRef);
    if (!purchaseSnap.exists()) {
      return { success: false as const, error: 'Purchase not found.' };
    }
    const purchase = { id: purchaseSnap.id, ...purchaseSnap.data() } as Purchase;

    const lines = data.lines.filter(line => Number(line.quantity) > 0);
    if (lines.length === 0) {
      return { success: false as const, error: 'Select at least one item quantity to return.' };
    }

    // Everything below only needs plain reads, which stay outside the transaction.
    const existingReturns = (await getPurchaseReturns(userId))
      .filter(r => r.purchaseDocId === data.purchaseDocId);
    const remaining = remainingReturnableQuantities(purchase.items, existingReturns);
    for (const line of lines) {
      if (Number(line.quantity) > (remaining[line.lineIndex] ?? 0)) {
        return {
          success: false as const,
          error: `Cannot return more than purchased for ${purchase.items[line.lineIndex]?.itemName || 'an item'}.`,
        };
      }
    }

    // Resolve the item doc behind each purchase line the same way the purchase
    // form does: by title plus expiry. Lines whose item no longer exists are
    // still returnable for money — only the stock deduction is skipped.
    const itemsCollection = collection(userRef, 'items');
    const lineItemIds = new Map<number, string>();
    for (const line of lines) {
      const purchaseItem = purchase.items[line.lineIndex];
      if (!purchaseItem) continue;
      let q = query(itemsCollection, where('title', '==', purchaseItem.itemName));
      if (purchaseItem.expiryDate) {
        q = query(q, where('expiryDate', '==', purchaseItem.expiryDate));
      }
      const snap = await getDocs(q);
      if (!snap.empty) lineItemIds.set(line.lineIndex, snap.docs[0].id);
    }

    const supplierPurchaseIds = new Set(
      (await getDocs(query(purchasesCollection, where('supplier', '==', purchase.supplier)))).docs
        .map(d => d.data() as Purchase)
        .map(p => p.purchaseId)
    );
    const payablesSnap = await getDocs(query(
      collection(userRef, 'transactions'),
      where('type', '==', 'Payable'),
      where('status', '==', 'Pending')
    ));
    const pendingByPurchase = new Map<string, Transaction[]>();
    for (const d of payablesSnap.docs) {
      const t = {
        id: d.id,
        ...d.data(),
        dueDate: d.data().dueDate?.toDate?.().toISOString() || '',
      } as Transaction;
      pendingByPurchase.set(t.purchaseId || '', [...(pendingByPurchase.get(t.purchaseId || '') || []), t]);
    }
    // Attribute each pending payable to the supplier: linked purchases win,
    // otherwise the customerName free-text field holds the supplier name.
    const pendingPayables: Transaction[] = [];
    for (const [pid, group] of pendingByPurchase) {
      if (pid && supplierPurchaseIds.has(pid)) {
        pendingPayables.push(...group);
      } else if (!pid) {
        pendingPayables.push(...group.filter(t =>
          (t.customerName || '').trim() === purchase.supplier.trim() ||
          Array.from(supplierPurchaseIds).some(sp => ledgerDocMatchesPurchase(t, sp))
        ));
      }
    }

    const refundValue = computeRefundTotal(lines);

    const duePlan = data.refundMethod === 'Due'
      ? planDueAdjustment(
          pendingPayables.map(t => ({ id: t.id, amount: Number(t.amount) || 0, date: t.dueDate })),
          refundValue
        )
      : [];
    if (data.refundMethod === 'Due' && !duePlan) {
      return {
        success: false as const,
        error: `Outstanding due with ${purchase.supplier} is less than the return value. Choose a Cash or Bank refund instead.`,
      };
    }

    const result = await runTransaction(db, async transaction => {
      const metadataRef = doc(userRef, 'metadata', 'counters');
      const returnsCollection = collection(userRef, 'purchase_returns');
      const expensesCollection = collection(userRef, 'expenses');
      const transactionsCollection = collection(userRef, 'transactions');

      // FIRESTORE RULE: all reads happen before any writes.
      const metadataDoc = await transaction.get(metadataRef);
      const metadata = (metadataDoc.data() as Metadata) || {};

      const itemDocs = await Promise.all(
        lines.map(line => {
          const itemId = lineItemIds.get(line.lineIndex);
          return itemId ? transaction.get(doc(itemsCollection, itemId)) : Promise.resolve(null);
        })
      );

      const payableDocs = duePlan
        ? await Promise.all(
            duePlan.map(reduction => transaction.get(doc(transactionsCollection, reduction.payableId)))
          )
        : [];

      const returnNumber = (metadata.lastPurchaseReturnNumber || 0) + 1;
      const returnId = `PRT-${String(returnNumber).padStart(4, '0')}`;

      // Plan the stock deduction per line: batches this purchase received go
      // first, any shortfall falls back to other batches by earliest expiry.
      const byEarliestExpiry = (a: AllocatableBatch, b: AllocatableBatch) =>
        (a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY) -
        (b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY);

      const plannedStock: { itemRef: ReturnType<typeof doc>; newStock: number }[] = [];
      const plannedBatchUpdates: { ref: ReturnType<typeof doc>; quantity: number }[] = [];
      const plannedBatchDeletes: ReturnType<typeof doc>[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const itemId = lineItemIds.get(line.lineIndex);
        const itemDoc = itemDocs[i];
        if (!itemId || !itemDoc || !itemDoc.exists()) continue;

        const itemStock = Number(itemDoc.data().stock) || 0;
        const qty = Number(line.quantity) || 0;
        if (itemStock < qty) {
          throw new Error(`Not enough stock for ${purchase.items[line.lineIndex].itemName} (available ${itemStock}). Goods may already be sold.`);
        }
        plannedStock.push({ itemRef: doc(itemsCollection, itemId), newStock: itemStock - qty });

        const batches = await fetchItemBatches(userId, itemId);
        const own = batches.filter(b => b.purchaseId === purchase.purchaseId);
        const others = batches.filter(b => b.purchaseId !== purchase.purchaseId).sort(byEarliestExpiry);

        let toDeduct = qty;
        for (const pool of [own, others]) {
          for (const batch of pool) {
            if (toDeduct <= 0) break;
            const take = Math.min(batch.quantity, toDeduct);
            toDeduct -= take;
            const batchRef = doc(batchesCollectionRefLocal(userRef, itemId), batch.id);
            if (batch.quantity - take <= 0) {
              plannedBatchDeletes.push(batchRef);
            } else {
              plannedBatchUpdates.push({ ref: batchRef, quantity: batch.quantity - take });
            }
          }
          if (toDeduct <= 0) break;
        }
      }

      // --- writes start here ---
      for (const stockWrite of plannedStock) {
        transaction.update(stockWrite.itemRef, { stock: stockWrite.newStock });
      }
      for (const batchWrite of plannedBatchUpdates) {
        transaction.update(batchWrite.ref, { quantity: batchWrite.quantity });
      }
      for (const batchRef of plannedBatchDeletes) {
        transaction.delete(batchRef);
      }

      // Money back: reduce the supplier's pending payables, or record a
      // negative expense so cash/bank inflow is traceable.
      if (data.refundMethod === 'Due' && duePlan) {
        duePlan.forEach((reduction, i) => {
          const payableDoc = payableDocs[i];
          if (!payableDoc || !payableDoc.exists()) return;
          const currentAmount = Number(payableDoc.data().amount) || 0;
          const newAmount = Math.max(0, currentAmount - reduction.reduceBy);
          transaction.update(payableDoc.ref, newAmount === 0
            ? { amount: 0, status: 'Paid', isHiddenFromHistory: true }
            : { amount: newAmount });
        });
      } else if (refundValue > 0) {
        const expenseNumber = (metadata.lastExpenseNumber || 0) + 1;
        transaction.set(doc(expensesCollection), {
          expenseId: `EXP-${String(expenseNumber).padStart(4, '0')}`,
          description: `Supplier Refund: ${returnId} from ${purchase.supplier}`,
          amount: -refundValue,
          paymentMethod: data.refundMethod,
          purchaseId: purchase.purchaseId,
          date: Timestamp.fromDate(new Date()),
        });
        transaction.set(metadataRef, { lastExpenseNumber: expenseNumber }, { merge: true });
      }

      const returnItems: PurchaseReturnItem[] = lines.map(line => ({
        lineIndex: line.lineIndex,
        itemName: purchase.items[line.lineIndex]?.itemName || '',
        quantity: Number(line.quantity) || 0,
        cost: Number(line.cost) || 0,
      }));

      const newReturnRef = doc(returnsCollection);
      const returnDate = new Date();
      const returnData = {
        returnId,
        purchaseDocId: data.purchaseDocId,
        purchaseId: purchase.purchaseId,
        supplier: purchase.supplier,
        items: returnItems,
        totalReturnValue: refundValue,
        refundMethod: data.refundMethod,
        date: Timestamp.fromDate(returnDate),
      };
      transaction.set(newReturnRef, returnData);
      transaction.set(metadataRef, { lastPurchaseReturnNumber: returnNumber }, { merge: true });

      const purchaseReturnForClient: PurchaseReturn = {
        id: newReturnRef.id,
        ...returnData,
        date: returnDate.toISOString(),
      };
      return { success: true as const, purchaseReturn: purchaseReturnForClient };
    });

    await invalidateItemsCatalog(userId);
    invalidateLedgerCaches(userId);
    revalidatePath('/purchases');
    revalidatePath('/payables');
    revalidatePath('/expenses');
    revalidatePath('/suppliers');
    revalidatePath('/reports');
    return result;
  } catch (e) {
    console.error('Purchase return creation failed: ', e);
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

// Local alias keeps the Firestore collection path logic in one visible place.
function batchesCollectionRefLocal(userRef: ReturnType<typeof doc>, itemId: string) {
  return collection(userRef, 'items', itemId, 'batches');
}
