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

    // 1. Pre-fetch selected items and retrieve all alternative expiry batches (outside the transaction)
    const selectedItemRefs = data.items.map(item => doc(itemsCollection, item.itemId));
    const selectedItemSnaps = await Promise.all(selectedItemRefs.map(ref => getDoc(ref)));

    const batchRefsMap: Record<string, { ref: any; isMedicine: boolean; title: string }[]> = {};
    const allBatchRefs: any[] = [];

    for (let i = 0; i < selectedItemSnaps.length; i++) {
      const snap = selectedItemSnaps[i];
      if (!snap.exists()) {
        return { success: false, error: `Item with id ${data.items[i].itemId} does not exist.` };
      }
      const itemData = snap.data() as Item;
      const catNameLower = (itemData.categoryName || '').toLowerCase();
      if (catNameLower === 'assets' || catNameLower === 'surgicals') {
        return { success: false, error: `Item "${itemData.title}" is an asset/surgical product and cannot be sold.` };
      }
      const isMedicine = itemData.categoryName?.toLowerCase().includes('medicine') || !!itemData.expiryDate;
      const itemId = snap.id;

      if (isMedicine) {
        // Query all items with the same title to find alternative expiry batches
        const q = query(itemsCollection, where("title", "==", itemData.title));
        const batchSnap = await getDocs(q);
        const batches = batchSnap.docs.map(doc => ({
          ref: doc.ref,
          isMedicine: true,
          title: itemData.title,
        }));
        batchRefsMap[itemId] = batches;
        batches.forEach(b => {
          if (!allBatchRefs.some(ref => ref.path === b.ref.path)) {
            allBatchRefs.push(b.ref);
          }
        });
      } else {
        batchRefsMap[itemId] = [{ ref: snap.ref, isMedicine: false, title: itemData.title }];
        if (!allBatchRefs.some(ref => ref.path === snap.ref.path)) {
          allBatchRefs.push(snap.ref);
        }
      }
    }

    const result = await runTransaction(db, async (transaction) => {
      const metadataDoc = await transaction.get(metadataRef);
      const customerDoc = await transaction.get(customerRef);
      const batchDocs = await Promise.all(allBatchRefs.map(ref => transaction.get(ref)));

      if (!customerDoc.exists()) {
        throw new Error(`Customer with id ${data.customerId} does not exist!`);
      }

      const batchDocsMap: Record<string, { ref: any; data: Item; id: string }> = {};
      batchDocs.forEach(doc => {
        if (doc.exists()) {
          batchDocsMap[doc.id] = {
            ref: doc.ref,
            data: doc.data() as Item,
            id: doc.id,
          };
        }
      });

      const lastSaleNumber = (metadataDoc.data() as Metadata)?.lastSaleNumber || 0;
      const newSaleNumber = lastSaleNumber + 1;
      const saleId = `SALE-${String(newSaleNumber).padStart(4, '0')}`;

      let calculatedSubtotal = 0;
      let totalProductionCost = 0;
      const itemsWithPrices: SaleItem[] = [];

      // Array to keep track of updates we need to make to batch stocks
      const stockUpdatesToMake: { ref: any; newStock: number }[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const saleItem = data.items[i];
        const batches = batchRefsMap[saleItem.itemId];
        const itemTitle = batches[0]?.title || '';

        // Calculate total available stock across all batches
        const totalAvailableStock = batches.reduce((sum, b) => {
          const docState = batchDocsMap[b.ref.id];
          return sum + (docState ? Number(docState.data.stock) || 0 : 0);
        }, 0);

        if (totalAvailableStock < Number(saleItem.quantity)) {
          throw new Error(`Not enough stock for ${itemTitle}. Available: ${totalAvailableStock}, Requested: ${saleItem.quantity}`);
        }

        // Sort batches: earliest expiry date first
        const sortedBatches = [...batches]
          .map(b => batchDocsMap[b.ref.id])
          .filter(Boolean);

        if (batches[0]?.isMedicine) {
          sortedBatches.sort((a, b) => {
            const expA = a.data.expiryDate || '';
            const expB = b.data.expiryDate || '';
            if (!expA && !expB) return 0;
            if (!expA) return 1; // place items without expiry date at the end
            if (!expB) return -1;
            return expA.localeCompare(expB);
          });
        }

        let remainingQtyToDeduct = Number(saleItem.quantity);
        let itemProductionCost = 0;

        for (const batch of sortedBatches) {
          if (remainingQtyToDeduct <= 0) break;
          const currentStock = Number(batch.data.stock) || 0;
          if (currentStock <= 0) continue;

          const qtyToDeductFromThisBatch = Math.min(currentStock, remainingQtyToDeduct);
          const newStock = currentStock - qtyToDeductFromThisBatch;

          itemProductionCost += (Number(batch.data.productionPrice) || 0) * qtyToDeductFromThisBatch;
          
          stockUpdatesToMake.push({ ref: batch.ref, newStock });
          
          // Update local map state so other items in this transaction (if any) see intermediate stocks
          batch.data.stock = newStock;
          remainingQtyToDeduct -= qtyToDeductFromThisBatch;
        }

        totalProductionCost += itemProductionCost;
        
        // Price for this sale item
        const primaryDocState = batchDocsMap[saleItem.itemId];
        const price = saleItem.price !== undefined && saleItem.price !== null 
          ? Number(saleItem.price) 
          : Number(primaryDocState?.data.sellingPrice || 0);

        calculatedSubtotal += price * Number(saleItem.quantity);
        itemsWithPrices.push({ ...saleItem, price });
      }

      let discountAmount = 0;
      if (data.discountType === 'percentage' && data.discountValue !== undefined) {
        discountAmount = calculatedSubtotal * (data.discountValue / 100);
      } else if (data.discountType === 'amount' && data.discountValue !== undefined) {
        discountAmount = data.discountValue;
      }
      discountAmount = Math.min(calculatedSubtotal, discountAmount);

      let totalAfterDiscount = calculatedSubtotal - discountAmount;
      if (data.total !== undefined && data.total !== null && data.total >= 0) {
        totalAfterDiscount = data.total;
      }
      const totalSaleProfit = totalAfterDiscount - totalProductionCost;

      const creditApplied = data.creditApplied || 0;
      const finalTotal = totalAfterDiscount - creditApplied;

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

      // Apply batch stock updates
      stockUpdatesToMake.forEach(update => {
        transaction.update(update.ref, { stock: update.newStock });
      });

      const currentDue = customerDoc.data()?.dueBalance || 0;
      let finalDue = currentDue;

      if (creditApplied > 0) {
        finalDue += creditApplied;
      }

      if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
        let dueAmount = finalTotal;
        let realizedProfit = 0;

        if (data.paymentMethod === 'Split' && data.amountPaid && data.amountPaid > 0) {
          dueAmount = finalTotal - data.amountPaid;

          if (finalTotal > 0) {
            realizedProfit = totalSaleProfit * (data.amountPaid / finalTotal);
          }
        }

        if (dueAmount > 0) {
          finalDue += dueAmount;
          const remainingProfit = totalSaleProfit - realizedProfit;

          const receivableData = {
            description: `Due from ${saleId}`,
            amount: dueAmount,
            dueDate: Timestamp.fromDate(new Date()),
            status: 'Pending' as const,
            type: 'Receivable' as const,
            customerId: data.customerId,
            saleId: saleId,
            totalSaleProfit: totalSaleProfit,
            remainingProfit: remainingProfit,
          };
          transaction.set(doc(transactionsCollection), receivableData);
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

    const selectedItemRefs = data.items.map((item) => doc(itemsCollection, item.itemId));
    const selectedItemSnaps = await Promise.all(selectedItemRefs.map((ref) => getDoc(ref)));

    const batchRefsMap: Record<string, { ref: any; isMedicine: boolean; title: string }[]> = {};
    const allBatchRefs: any[] = [];

    for (let i = 0; i < selectedItemSnaps.length; i++) {
      const snap = selectedItemSnaps[i];
      if (!snap.exists()) {
        return { success: false, error: `Item with id ${data.items[i].itemId} does not exist.` };
      }
      const itemData = snap.data() as Item;
      const catNameLower = (itemData.categoryName || '').toLowerCase();
      if (catNameLower === 'assets' || catNameLower === 'surgicals') {
        return { success: false, error: `Item "${itemData.title}" is an asset/surgical product and cannot be sold.` };
      }
      const isMedicine = itemData.categoryName?.toLowerCase().includes('medicine') || !!itemData.expiryDate;
      const itemId = snap.id;

      if (isMedicine) {
        const q = query(itemsCollection, where("title", "==", itemData.title));
        const batchSnap = await getDocs(q);
        const batches = batchSnap.docs.map((d) => ({
          ref: d.ref,
          isMedicine: true,
          title: itemData.title,
        }));
        batchRefsMap[itemId] = batches;
        batches.forEach((b) => {
          if (!allBatchRefs.some((ref) => ref.path === b.ref.path)) {
            allBatchRefs.push(b.ref);
          }
        });
      } else {
        batchRefsMap[itemId] = [{ ref: snap.ref, isMedicine: false, title: itemData.title }];
        if (!allBatchRefs.some((ref) => ref.path === snap.ref.path)) {
          allBatchRefs.push(snap.ref);
        }
      }
    }

    const oldItemRefs = oldSale.items.map((item) => doc(itemsCollection, item.itemId));
    oldItemRefs.forEach((ref) => {
      if (!allBatchRefs.some((bRef) => bRef.path === ref.path)) {
        allBatchRefs.push(ref);
      }
    });

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

      const batchDocs = await Promise.all(allBatchRefs.map((ref) => transaction.get(ref)));
      const batchDocsMap: Record<string, { ref: any; data: Item; id: string }> = {};
      batchDocs.forEach((d) => {
        if (d.exists()) {
          batchDocsMap[d.id] = {
            ref: d.ref,
            data: d.data() as Item,
            id: d.id,
          };
        }
      });

      // 1. Restore stock from oldSale.items
      for (const oldItem of oldSale.items) {
        const docState = batchDocsMap[oldItem.itemId];
        if (docState) {
          docState.data.stock = (Number(docState.data.stock) || 0) + Number(oldItem.quantity);
        }
      }

      // 2. Calculate new sale quantities and deduct from batch stocks
      let calculatedSubtotal = 0;
      let totalProductionCost = 0;
      const itemsWithPrices: SaleItem[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const saleItem = data.items[i];
        const batches = batchRefsMap[saleItem.itemId];
        const itemTitle = batches[0]?.title || '';

        const totalAvailableStock = batches.reduce((sum, b) => {
          const docState = batchDocsMap[b.ref.id];
          return sum + (docState ? Number(docState.data.stock) || 0 : 0);
        }, 0);

        if (totalAvailableStock < Number(saleItem.quantity)) {
          throw new Error(`Not enough stock for ${itemTitle}. Available: ${totalAvailableStock}, Requested: ${saleItem.quantity}`);
        }

        const sortedBatches = [...batches]
          .map((b) => batchDocsMap[b.ref.id])
          .filter(Boolean);

        if (batches[0]?.isMedicine) {
          sortedBatches.sort((a, b) => {
            const expA = a.data.expiryDate || '';
            const expB = b.data.expiryDate || '';
            if (!expA && !expB) return 0;
            if (!expA) return 1;
            if (!expB) return -1;
            return expA.localeCompare(expB);
          });
        }

        let remainingQtyToDeduct = Number(saleItem.quantity);
        let itemProductionCost = 0;

        for (const batch of sortedBatches) {
          if (remainingQtyToDeduct <= 0) break;
          const currentStock = Number(batch.data.stock) || 0;
          if (currentStock <= 0) continue;

          const qtyToDeductFromThisBatch = Math.min(currentStock, remainingQtyToDeduct);
          const newStock = currentStock - qtyToDeductFromThisBatch;

          itemProductionCost += (Number(batch.data.productionPrice) || 0) * qtyToDeductFromThisBatch;
          batch.data.stock = newStock;
          remainingQtyToDeduct -= qtyToDeductFromThisBatch;
        }

        totalProductionCost += itemProductionCost;

        const primaryDocState = batchDocsMap[saleItem.itemId];
        const price =
          saleItem.price !== undefined && saleItem.price !== null
            ? Number(saleItem.price)
            : Number(primaryDocState?.data.sellingPrice || 0);

        calculatedSubtotal += price * Number(saleItem.quantity);
        itemsWithPrices.push({ ...saleItem, price });
      }

      let discountAmount = 0;
      if (data.discountType === 'percentage' && data.discountValue !== undefined) {
        discountAmount = calculatedSubtotal * (data.discountValue / 100);
      } else if (data.discountType === 'amount' && data.discountValue !== undefined) {
        discountAmount = data.discountValue;
      }
      discountAmount = Math.min(calculatedSubtotal, discountAmount);

      let totalAfterDiscount = calculatedSubtotal - discountAmount;
      if (data.total !== undefined && data.total !== null && data.total >= 0) {
        totalAfterDiscount = data.total;
      }
      const totalSaleProfit = totalAfterDiscount - totalProductionCost;

      const creditApplied = data.creditApplied || 0;
      const finalTotal = totalAfterDiscount - creditApplied;

      // 3. Apply stock updates to firestore docs
      Object.values(batchDocsMap).forEach((docState) => {
        transaction.update(docState.ref, { stock: docState.data.stock });
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
        let dueAmount = finalTotal;
        let realizedProfit = 0;

        if (data.paymentMethod === 'Split' && data.amountPaid && data.amountPaid > 0) {
          dueAmount = finalTotal - data.amountPaid;
          if (finalTotal > 0) {
            realizedProfit = totalSaleProfit * (data.amountPaid / finalTotal);
          }
        }

        if (dueAmount > 0) {
          const remainingProfit = totalSaleProfit - realizedProfit;
          const receivableData = {
            description: `Due from ${oldSale.saleId}`,
            amount: dueAmount,
            dueDate: Timestamp.fromDate(new Date()),
            status: 'Pending' as const,
            type: 'Receivable' as const,
            customerId: data.customerId,
            saleId: oldSale.saleId,
            totalSaleProfit: totalSaleProfit,
            remainingProfit: remainingProfit,
          };
          transaction.set(doc(transactionsCollection), receivableData);
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

