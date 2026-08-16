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
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Item, Metadata, Sale, SaleItem } from '../types';
import { resolveIsSalable } from '../item-flags';
import { buildReceivable, computeSaleTotals } from './sale-calculation';
import { docToSale } from './utils';

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

      let totalProductionCost = 0;
      const itemsWithPrices: SaleItem[] = [];

      // Array to keep track of updates we need to make to item stocks
      const stockUpdatesToMake: { ref: any; newStock: number }[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const saleItem = data.items[i];
        const itemState = itemDocsMap[saleItem.itemId];

        if (!itemState) {
          throw new Error(`Item with id ${saleItem.itemId} not found.`);
        }

        const itemTitle = itemState.data.title || '';
        const currentStock = Number(itemState.data.stock) || 0;
        const qtyRequested = Number(saleItem.quantity);

        if (currentStock < qtyRequested) {
          throw new Error(`Not enough stock for ${itemTitle}. Available in selected item: ${currentStock}, Requested: ${qtyRequested}`);
        }

        const newStock = currentStock - qtyRequested;
        const itemProductionCost = (Number(itemState.data.productionPrice) || 0) * qtyRequested;

        stockUpdatesToMake.push({ ref: itemState.ref, newStock });

        // Update local map state in case the same item is included multiple times
        itemState.data.stock = newStock;
        totalProductionCost += itemProductionCost;

        // Price for this sale item
        const price = saleItem.price !== undefined && saleItem.price !== null
          ? Number(saleItem.price)
          : Number(itemState.data.sellingPrice || 0);

        itemsWithPrices.push({ ...saleItem, price });
      }

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

      // Apply item stock updates
      stockUpdatesToMake.forEach(update => {
        transaction.update(update.ref, { stock: update.newStock });
      });

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

      // --- WRITE PHASE ---

      // 1. Restore item stock
      for (let i = 0; i < itemDocs.length; i++) {
        const itemDoc = itemDocs[i];
        if (itemDoc.exists()) {
          const newStock = Number(itemDoc.data().stock) + Number(saleToDelete.items[i].quantity);
          transaction.update(itemDoc.ref, { stock: newStock });
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

      // 1. Restore stock from oldSale.items to the exact old item IDs
      for (const oldItem of oldSale.items) {
        const itemState = itemDocsMap[oldItem.itemId];
        if (itemState) {
          const restoredStock = (Number(itemState.data.stock) || 0) + Number(oldItem.quantity);
          itemState.data.stock = restoredStock;
          transaction.update(itemState.ref, { stock: restoredStock });
        }
      }

      // 2. Deduct stock from newSale.items strictly on the selected item IDs
      let totalProductionCost = 0;
      const itemsWithPrices: SaleItem[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const saleItem = data.items[i];
        const itemState = itemDocsMap[saleItem.itemId];

        if (!itemState) {
          throw new Error(`Item with id ${saleItem.itemId} not found.`);
        }

        const itemTitle = itemState.data.title || '';
        const currentStock = Number(itemState.data.stock) || 0;
        const qtyRequested = Number(saleItem.quantity);

        if (currentStock < qtyRequested) {
          throw new Error(`Not enough stock for ${itemTitle}. Available in selected item: ${currentStock}, Requested: ${qtyRequested}`);
        }

        const newStock = currentStock - qtyRequested;
        const itemProductionCost = (Number(itemState.data.productionPrice) || 0) * qtyRequested;

        transaction.update(itemState.ref, { stock: newStock });
        itemState.data.stock = newStock;
        totalProductionCost += itemProductionCost;

        const price =
          saleItem.price !== undefined && saleItem.price !== null
            ? Number(saleItem.price)
            : Number(itemState.data.sellingPrice || 0);

        itemsWithPrices.push({ ...saleItem, price });
      }

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

