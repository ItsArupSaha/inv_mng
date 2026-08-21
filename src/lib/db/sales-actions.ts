'use server';

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';import { db } from '../firebase';
import { invalidateCollectionCache, invalidateLedgerCaches } from './collection-cache';
import { invalidateItemsCatalog } from './catalog-version';
import type { Item, ItemBatch, Metadata, Sale, SaleItem } from '../types';
import { resolveIsSalable } from '../item-flags';
import { allocateFEFO, sumBatchQuantities } from '../batch-allocation';
import { batchDocRef, buildBatchData, fetchItemBatches, newBatchDocRef, type ItemBatchWithId } from './batch-utils';
import { buildReceivable, computeSaleTotals } from './sale-calculation';
import { docToSale } from './utils';
import type { Transaction } from 'firebase/firestore';

type SaleBatch = ItemBatchWithId & { isNew?: boolean };

/**
 * Reads an item's batches outside the transaction (plain getDocs — the
 * transaction query API is unavailable in this Firestore build). Stock that
 * predates batch tracking, or drifted past batch totals, is staged as a
 * virtual LEGACY entry the caller persists inside the transaction.
 */
async function loadBatchesForSale(
  userId: string,
  itemId: string,
  itemData: Item
): Promise<{ batches: SaleBatch[]; originalQuantities: Record<string, number> }> {
  const batches: SaleBatch[] = (await fetchItemBatches(userId, itemId)).map(b => ({ ...b }));
  const originalQuantities: Record<string, number> = {};
  for (const b of batches) originalQuantities[b.id] = b.quantity;

  const stock = Number(itemData.stock) || 0;

  if (batches.length === 0 && stock > 0) {
    const ref = newBatchDocRef(userId, itemId);
    const legacy = buildBatchData({
      batchNo: 'LEGACY',
      expiryDate: itemData.expiryDate ?? null,
      quantity: stock,
      initialQuantity: stock,
      cost: Number(itemData.productionPrice) || 0,
    });
    batches.push({ ...legacy, id: ref.id, isNew: true });
    originalQuantities[ref.id] = 0;
  }

  // Self-heal drift: stock recorded on the item beyond what batches account
  // for (manual edits, pre-batch purchases) lands in the LEGACY batch.
  const drift = stock - sumBatchQuantities(batches);
  if (batches.length > 0 && drift > 0) {
    let legacy = batches.find(b => b.batchNo === 'LEGACY');
    if (!legacy) {
      const ref = newBatchDocRef(userId, itemId);
      const data = buildBatchData({
        batchNo: 'LEGACY',
        expiryDate: itemData.expiryDate ?? null,
        quantity: 0,
        initialQuantity: 0,
        cost: Number(itemData.productionPrice) || 0,
      });
      legacy = { ...data, id: ref.id, isNew: true };
      batches.push(legacy);
      originalQuantities[ref.id] = 0;
    }
    legacy.quantity += drift;
  }

  return { batches, originalQuantities };
}

interface DeductResult {
  itemsWithPrices: SaleItem[];
  totalProductionCost: number;
}

type BatchRestorePlan = {
  ref: ReturnType<typeof batchDocRef>;
  exists: boolean;
  currentQty: number;
  alloc: NonNullable<SaleItem['batches']>[number];
};

/**
 * FEFO deduction shared by addSale and updateSale: validates stock against
 * live batch quantities, consumes earliest-expiry batches first, writes the
 * per-batch decrements plus the item stock total, and freezes per-unit cost
 * at sale time on each line's allocation.
 */
async function deductSaleLinesFEFO(
  transaction: Transaction,
  userId: string,
  itemDocsMap: Record<string, { ref: any; data: Item; id: string }>,
  saleItems: SaleItem[]
): Promise<DeductResult> {
  const itemsWithPrices: SaleItem[] = [];
  let totalProductionCost = 0;

  const batchesByItem: Record<string, SaleBatch[]> = {};
  const originalsByItem: Record<string, Record<string, number>> = {};
  const ensureBatches = async (itemId: string) => {
    if (!batchesByItem[itemId]) {
      const itemState = itemDocsMap[itemId];
      const { batches, originalQuantities } = await loadBatchesForSale(userId, itemId, itemState.data);
      batchesByItem[itemId] = batches;
      originalsByItem[itemId] = originalQuantities;
    }
    return batchesByItem[itemId];
  };

  for (const saleItem of saleItems) {
    const itemState = itemDocsMap[saleItem.itemId];
    if (!itemState) {
      throw new Error(`Item with id ${saleItem.itemId} not found.`);
    }

    const itemTitle = itemState.data.title || '';
    const qtyRequested = Number(saleItem.quantity);
    const batches = await ensureBatches(saleItem.itemId);
    const effectiveStock = batches.length > 0 ? sumBatchQuantities(batches) : Number(itemState.data.stock) || 0;

    if (effectiveStock < qtyRequested) {
      throw new Error(`Not enough stock for ${itemTitle}. Available in selected item: ${effectiveStock}, Requested: ${qtyRequested}`);
    }

    const price = saleItem.price !== undefined && saleItem.price !== null
      ? Number(saleItem.price)
      : Number(itemState.data.sellingPrice || 0);

    let lineCost = 0;
    let allocations: SaleItem['batches'];

    if (batches.length > 0) {
      const plan = allocateFEFO(batches, qtyRequested);
      for (const alloc of plan.allocations) {
        const batch = batches.find(b => b.id === alloc.batchId);
        if (batch) batch.quantity -= alloc.quantity;
        lineCost += alloc.quantity * alloc.costAtSale;
      }
      allocations = plan.allocations;
    } else {
      lineCost = (Number(itemState.data.productionPrice) || 0) * qtyRequested;
    }

    const newStockTotal = effectiveStock - qtyRequested;
    transaction.update(itemState.ref, { stock: newStockTotal });
    itemState.data.stock = newStockTotal; // keep local state fresh for duplicate lines
    totalProductionCost += lineCost;

    itemsWithPrices.push({ ...saleItem, price, batches: allocations });
  }

  // Persist every batch change once, after all lines are allocated: virtual
  // LEGACY entries are created, existing batches get their final quantity.
  for (const [itemId, batches] of Object.entries(batchesByItem)) {
    const originals = originalsByItem[itemId];
    for (const batch of batches) {
      const ref = batchDocRef(userId, itemId, batch.id);
      if (batch.isNew) {
        const { id: _id, isNew: _isNew, ...data } = batch;
        transaction.set(ref, data);
      } else if (batch.quantity !== originals[batch.id]) {
        transaction.update(ref, { quantity: batch.quantity });
      }
    }
  }

  return { itemsWithPrices, totalProductionCost };
}

/**
 * Read phase of batch restoration: fetches every batch document a sale line's
 * allocations point at via transaction reads. Firestore requires all
 * transaction reads before the first staged write, so planning and applying
 * are separate steps.
 */
async function planBatchRestores(
  transaction: Transaction,
  userId: string,
  line: SaleItem
): Promise<BatchRestorePlan[]> {
  if (!line.batches?.length) return [];

  const plans: BatchRestorePlan[] = [];
  for (const alloc of line.batches) {
    const ref = batchDocRef(userId, line.itemId, alloc.batchId);
    const snap = await transaction.get(ref);
    plans.push({
      ref,
      exists: snap.exists(),
      currentQty: snap.exists() ? Number(snap.data().quantity) || 0 : 0,
      alloc,
    });
  }
  return plans;
}

/** Write phase of batch restoration; pairs with planBatchRestores. */
function applyBatchRestores(
  transaction: Transaction,
  plans: BatchRestorePlan[]
): void {
  for (const plan of plans) {
    if (plan.exists) {
      transaction.update(plan.ref, { quantity: plan.currentQty + plan.alloc.quantity });
    } else {
      transaction.set(plan.ref, buildBatchData({
        batchNo: plan.alloc.batchNo,
        expiryDate: plan.alloc.expiryDate ?? null,
        quantity: plan.alloc.quantity,
        initialQuantity: plan.alloc.quantity,
        cost: plan.alloc.costAtSale,
      }));
    }
  }
}

export async function addSale(
  userId: string,
  data: Omit<Sale, 'id' | 'saleId' | 'subtotal' | 'total'> & { creditApplied?: number; total?: number }
): Promise<{ success: boolean; error?: string; sale?: Sale }> {
  if (!db || !userId) return { success: false, error: "Database not configured." };

  try {
    const userRef = doc(db, 'users', userId);
    const itemsCollection = collection(userRef, 'items');
    const customersCollection = collection(userRef, 'customers');
    const salesCollection = collection(userRef, 'sales');
    const transactionsCollection = collection(userRef, 'transactions');
    const metadataRef = doc(userRef, 'metadata', 'counters');
    const customerRef = doc(customersCollection, data.customerId);
    const saleDate = new Date(data.date) || new Date();

    // 1. Pre-fetch selected item documents
    const selectedItemRefs = data.items.map(item => doc(itemsCollection, item.itemId));
    const selectedItemSnaps = await Promise.all(selectedItemRefs.map(ref => getDoc(ref)));

    for (let i = 0; i < selectedItemSnaps.length; i++) {
      const snap = selectedItemSnaps[i];
      if (!snap.exists()) {
        return { success: false, error: `Item with id ${data.items[i].itemId} does not exist.` };
      }
      const itemData = snap.data() as Item;
      if (!resolveIsSalable(itemData)) {
        return { success: false, error: `Item "${itemData.title}" is a non-salable asset and cannot be sold.` };
      }
      // Narcotics register compliance: server-side guard so scheduled
      // medicines can never be committed without a prescription reference,
      // even if the POS validation is bypassed.
      if (itemData.schedule && !data.prescriptionRef?.trim()) {
        return {
          success: false,
          error: `A prescription reference is required for the scheduled medicine "${itemData.title}".`,
        };
      }
    }

    const result = await runTransaction(db, async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const customerDoc = await transaction.get(customerRef);
      const itemDocs = await Promise.all(selectedItemRefs.map(ref => transaction.get(ref)));

      if (!customerDoc.exists()) {
        throw new Error(`Customer with id ${data.customerId} does not exist!`);
      }

      const itemDocsMap: Record<string, { ref: any; data: Item; id: string }> = {};
      itemDocs.forEach(docSnap => {
        if (docSnap.exists()) {
          itemDocsMap[docSnap.id] = {
            ref: docSnap.ref,
            data: docSnap.data() as Item,
            id: docSnap.id,
          };
        }
      });

      const lastSaleNumber = (metadataDoc.data() as Metadata)?.lastSaleNumber || 0;
      const newSaleNumber = lastSaleNumber + 1;
      const saleId = `SALE-${String(newSaleNumber).padStart(4, '0')}`;

      const { itemsWithPrices, totalProductionCost } = await deductSaleLinesFEFO(
        transaction,
        userId,
        itemDocsMap,
        data.items
      );

      const creditApplied = data.creditApplied || 0;
      const { subtotal: calculatedSubtotal, totalAfterDiscount, finalTotal, totalSaleProfit } = computeSaleTotals({
        items: itemsWithPrices,
        totalProductionCost,
        discountType: data.discountType,
        discountValue: data.discountValue,
        totalOverride: data.total,
        creditApplied,
      });

      const newSaleRef = doc(salesCollection);

      // Clean up data: only include amountPaid and splitPaymentMethod for Split payments
      const cleanedData: any = { ...data };
      if (data.paymentMethod !== 'Split') {
        delete cleanedData.amountPaid;
        delete cleanedData.splitPaymentMethod;
      }
      if (!data.prescriptionRef?.trim()) {
        delete cleanedData.prescriptionRef;
      }

      const saleDataToSave: Omit<Sale, 'id'> & { date: Timestamp, creditApplied?: number } = {
        ...cleanedData,
        saleId,
        items: itemsWithPrices,
        subtotal: calculatedSubtotal,
        total: totalAfterDiscount,
        date: Timestamp.fromDate(saleDate) as any,
        creditApplied: creditApplied,
        paymentMethod: finalTotal <= 0 ? 'Paid by Credit' : data.paymentMethod,
      };
      transaction.set(newSaleRef, saleDataToSave);
      transaction.set(metadataRef, { lastSaleNumber: newSaleNumber }, { merge: true });

      const currentDue = customerDoc.data()?.dueBalance || 0;
      let finalDue = currentDue;

      if (creditApplied > 0) {
        finalDue += creditApplied;
      }

      if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
        const receivable = buildReceivable({
          paymentMethod: data.paymentMethod,
          amountPaid: data.amountPaid,
          finalTotal,
          totalSaleProfit,
          creditApplied,
          saleId,
          customerId: data.customerId,
        });

        if (receivable) {
          finalDue += receivable.amount;
          transaction.set(doc(transactionsCollection), {
            ...receivable,
            dueDate: Timestamp.fromDate(new Date()),
          });
        }
      }

      if (finalDue !== currentDue) {
        transaction.update(customerRef, { dueBalance: finalDue });
      }

      const saleForClient: Sale = {
        id: newSaleRef.id,
        ...saleDataToSave,
        total: totalAfterDiscount,
        date: saleDate.toISOString(),
      };

      return { success: true, sale: saleForClient };
    });

    await invalidateItemsCatalog(userId);
    invalidateCollectionCache('customers', userId);
    invalidateLedgerCaches(userId);
    revalidatePath('/sales');
    revalidatePath('/dashboard');
    revalidatePath('/items');
    revalidatePath('/receivables');
    if (data.customerId) {
      revalidatePath(`/customers/${data.customerId}`);
    }
    return result;

  } catch (e) {
    console.error("Sale creation failed: ", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteSale(userId: string, saleId: string): Promise<{ success: boolean; error?: string }> {
  if (!db || !userId) return { success: false, error: "Database not configured." };

  try {
    const saleRef = doc(db, 'users', userId, 'sales', saleId);

    await runTransaction(db, async (transaction) => {
      const userRef = doc(db!, 'users', userId);

      // --- READ PHASE ---
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists()) {
        throw new Error("Sale not found.");
      }
      const saleToDelete = docToSale(saleDoc);

      const customerRef = doc(userRef, 'customers', saleToDelete.customerId);
      const customerDoc = await transaction.get(customerRef);
      if (!customerDoc.exists()) {
        console.warn(`Customer ${saleToDelete.customerId} not found during sale deletion.`);
      }

      const itemRefs = saleToDelete.items.map(item => doc(userRef, 'items', item.itemId));
      const itemDocs = await Promise.all(itemRefs.map(ref => transaction.get(ref)));

      const transactionsCollection = collection(userRef, 'transactions');
      const relatedTransactionsQuery = query(transactionsCollection, where('saleId', '==', saleToDelete.saleId));
      const relatedTransactionDocs = await getDocs(relatedTransactionsQuery);

      // Batch restore reads must also complete before the first write.
      const restorePlans = await Promise.all(
        saleToDelete.items.map((line) => planBatchRestores(transaction, userId, line))
      );

      // --- WRITE PHASE ---

      // 1. Restore item stock and return quantities to originating batches
      for (let i = 0; i < itemDocs.length; i++) {
        const itemDoc = itemDocs[i];
        if (itemDoc.exists()) {
          const newStock = Number(itemDoc.data().stock) + Number(saleToDelete.items[i].quantity);
          transaction.update(itemDoc.ref, { stock: newStock });
          applyBatchRestores(transaction, restorePlans[i]);
        }
      }

      // 2. Adjust customer balance
      if (customerDoc.exists()) {
        let amountToReverse = 0;
        if (saleToDelete.paymentMethod === 'Due' || saleToDelete.paymentMethod === 'Split') {
          amountToReverse = saleToDelete.total - (saleToDelete.amountPaid || 0);
        }
        const creditReversal = saleToDelete.creditApplied || 0;
        const currentDue = customerDoc.data().dueBalance || 0;
        const newDueBalance = currentDue - amountToReverse + creditReversal;
        transaction.update(customerRef, { dueBalance: newDueBalance });
      }

      // 3. Delete related transactions
      relatedTransactionDocs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // 4. Delete the sale document
      transaction.delete(saleRef);
    });

    await invalidateItemsCatalog(userId);
    invalidateCollectionCache('customers', userId);
    invalidateLedgerCaches(userId);
    revalidatePath('/sales');
    revalidatePath('/items');
    revalidatePath('/dashboard');
    revalidatePath('/receivables');
    revalidatePath('/customers');

    return { success: true };
  } catch (e) {
    console.error("Sale deletion failed: ", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateSale(
  userId: string,
  saleDocId: string,
  data: Omit<Sale, 'id' | 'saleId' | 'subtotal' | 'total'> & { creditApplied?: number; total?: number; date?: string }
): Promise<{ success: boolean; error?: string; sale?: Sale }> {
  if (!db || !userId || !saleDocId) return { success: false, error: "Database not configured or invalid sale ID." };

  try {
    const userRef = doc(db, 'users', userId);
    const saleRef = doc(userRef, 'sales', saleDocId);
    const oldSaleSnap = await getDoc(saleRef);
    if (!oldSaleSnap.exists()) {
      return { success: false, error: "Sale not found." };
    }
    const oldSale = docToSale(oldSaleSnap);

    const itemsCollection = collection(userRef, 'items');
    const customersCollection = collection(userRef, 'customers');
    const transactionsCollection = collection(userRef, 'transactions');
    const saleDate = data.date ? new Date(data.date) : new Date(oldSale.date);

    const relatedTransactionsQuery = query(transactionsCollection, where('saleId', '==', oldSale.saleId));
    const relatedTransactionDocs = await getDocs(relatedTransactionsQuery);

    const allItemIdsToFetch = new Set<string>();
    data.items.forEach((item) => allItemIdsToFetch.add(item.itemId));
    oldSale.items.forEach((item) => allItemIdsToFetch.add(item.itemId));

    const selectedItemRefs = Array.from(allItemIdsToFetch).map((id) => doc(itemsCollection, id));
    const selectedItemSnaps = await Promise.all(selectedItemRefs.map((ref) => getDoc(ref)));

    for (let i = 0; i < selectedItemSnaps.length; i++) {
      const snap = selectedItemSnaps[i];
      if (!snap.exists()) {
        continue;
      }
      const itemData = snap.data() as Item;
      if (!resolveIsSalable(itemData)) {
        return { success: false, error: `Item "${itemData.title}" is a non-salable asset and cannot be sold.` };
      }
      // Scheduled-medicine guard; edits keep the reference already recorded on
      // the original sale when the dialog doesn't resend it.
      if (
        itemData.schedule &&
        data.items.some((line) => line.itemId === snap.id) &&
        !data.prescriptionRef?.trim() &&
        !oldSale.prescriptionRef?.trim()
      ) {
        return {
          success: false,
          error: `A prescription reference is required for the scheduled medicine "${itemData.title}".`,
        };
      }
    }

    const result = await runTransaction(db, async (transaction) => {
      const oldCustomerRef = doc(customersCollection, oldSale.customerId);
      const newCustomerRef = doc(customersCollection, data.customerId);

      const oldCustomerDoc = await transaction.get(oldCustomerRef);
      const newCustomerDoc =
        oldSale.customerId === data.customerId
          ? oldCustomerDoc
          : await transaction.get(newCustomerRef);

      if (!newCustomerDoc.exists()) {
        throw new Error(`Customer with id ${data.customerId} does not exist!`);
      }

      const itemDocs = await Promise.all(selectedItemRefs.map((ref) => transaction.get(ref)));
      const itemDocsMap: Record<string, { ref: any; data: Item; id: string }> = {};
      itemDocs.forEach((d) => {
        if (d.exists()) {
          itemDocsMap[d.id] = {
            ref: d.ref,
            data: d.data() as Item,
            id: d.id,
          };
        }
      });

      // Batch restore reads must complete before the first staged write.
      const restorePlans = await Promise.all(
        oldSale.items.map((oldItem) => planBatchRestores(transaction, userId, oldItem))
      );

      // 1. Restore stock from oldSale.items to the exact old item IDs
      //    (item total plus the originating batches)
      oldSale.items.forEach((oldItem, index) => {
        const itemState = itemDocsMap[oldItem.itemId];
        if (itemState) {
          const restoredStock = (Number(itemState.data.stock) || 0) + Number(oldItem.quantity);
          itemState.data.stock = restoredStock;
          transaction.update(itemState.ref, { stock: restoredStock });
          applyBatchRestores(transaction, restorePlans[index]);
        }
      });

      // 2. Deduct stock from newSale.items strictly on the selected item IDs (FEFO)
      const { itemsWithPrices, totalProductionCost } = await deductSaleLinesFEFO(
        transaction,
        userId,
        itemDocsMap,
        data.items
      );

      const creditApplied = data.creditApplied || 0;
      const { subtotal: calculatedSubtotal, totalAfterDiscount, finalTotal, totalSaleProfit } = computeSaleTotals({
        items: itemsWithPrices,
        totalProductionCost,
        discountType: data.discountType,
        discountValue: data.discountValue,
        totalOverride: data.total,
        creditApplied,
      });

      // 4. Adjust customer due balances
      if (oldCustomerDoc.exists()) {
        let oldAmountDue = 0;
        if (oldSale.paymentMethod === 'Due' || oldSale.paymentMethod === 'Split') {
          oldAmountDue = oldSale.total - (oldSale.amountPaid || 0);
        }
        const oldCredit = oldSale.creditApplied || 0;
        const currentOldDue = oldCustomerDoc.data().dueBalance || 0;
        const newOldCustomerDue = currentOldDue - oldAmountDue + oldCredit;

        if (oldSale.customerId === data.customerId) {
          let newAmountDue = 0;
          if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
            if (data.paymentMethod === 'Split' && data.amountPaid && data.amountPaid > 0) {
              newAmountDue = finalTotal - data.amountPaid;
            } else {
              newAmountDue = finalTotal;
            }
          }
          const finalCustomerDue = newOldCustomerDue + newAmountDue + creditApplied;
          transaction.update(newCustomerRef, { dueBalance: finalCustomerDue });
        } else {
          transaction.update(oldCustomerRef, { dueBalance: newOldCustomerDue });

          const currentNewDue = newCustomerDoc.data()?.dueBalance || 0;
          let newAmountDue = 0;
          if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
            if (data.paymentMethod === 'Split' && data.amountPaid && data.amountPaid > 0) {
              newAmountDue = finalTotal - data.amountPaid;
            } else {
              newAmountDue = finalTotal;
            }
          }
          const finalNewCustomerDue = currentNewDue + newAmountDue + creditApplied;
          transaction.update(newCustomerRef, { dueBalance: finalNewCustomerDue });
        }
      }

      // 5. Delete old related receivables
      relatedTransactionDocs.forEach((d) => transaction.delete(d.ref));

      // 6. Create new receivable transaction if Due or Split
      if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
        const receivable = buildReceivable({
          paymentMethod: data.paymentMethod,
          amountPaid: data.amountPaid,
          finalTotal,
          totalSaleProfit,
          creditApplied,
          saleId: oldSale.saleId,
          customerId: data.customerId,
        });

        if (receivable) {
          transaction.set(doc(transactionsCollection), {
            ...receivable,
            dueDate: Timestamp.fromDate(new Date()),
          });
        }
      }

      const cleanedData: any = { ...data };
      if (data.paymentMethod !== 'Split') {
        delete cleanedData.amountPaid;
        delete cleanedData.splitPaymentMethod;
      }
      // Preserve the recorded prescription reference when the edit dialog
      // doesn't resend it; strip it entirely when neither source has one so
      // Firestore never receives an undefined field value.
      if (data.prescriptionRef?.trim()) {
        cleanedData.prescriptionRef = data.prescriptionRef.trim();
      } else if (oldSale.prescriptionRef?.trim()) {
        cleanedData.prescriptionRef = oldSale.prescriptionRef;
      } else {
        delete cleanedData.prescriptionRef;
      }

      const updatedSaleData: Omit<Sale, 'id'> & { date: Timestamp; creditApplied?: number } = {
        ...cleanedData,
        saleId: oldSale.saleId,
        items: itemsWithPrices,
        subtotal: calculatedSubtotal,
        total: totalAfterDiscount,
        date: Timestamp.fromDate(saleDate) as any,
        creditApplied: creditApplied,
        paymentMethod: finalTotal <= 0 ? 'Paid by Credit' : data.paymentMethod,
      };

      transaction.update(saleRef, updatedSaleData);

      const saleForClient: Sale = {
        id: saleDocId,
        ...updatedSaleData,
        total: totalAfterDiscount,
        date: saleDate.toISOString(),
      };

      return { success: true, sale: saleForClient };
    });

    await invalidateItemsCatalog(userId);
    invalidateCollectionCache('customers', userId);
    invalidateLedgerCaches(userId);
    revalidatePath('/sales');
    revalidatePath('/dashboard');
    revalidatePath('/items');
    revalidatePath('/receivables');
    if (data.customerId) {
      revalidatePath(`/customers/${data.customerId}`);
    }
    return result;
  } catch (e) {
    console.error("Sale update failed: ", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

