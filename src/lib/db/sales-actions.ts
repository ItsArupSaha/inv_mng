'use server';

import {
  Timestamp,
  collection,
  doc,
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
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db!, 'users', userId);
      const metadataRef = doc(userRef, 'metadata', 'counters');
      const itemsCollection = collection(userRef, 'items');
      const customersCollection = collection(userRef, 'customers');
      const salesCollection = collection(userRef, 'sales');
      const transactionsCollection = collection(userRef, 'transactions');

      const saleDate = new Date(data.date) || new Date();
      const itemRefs = data.items.map(item => doc(itemsCollection, item.itemId));
      const customerRef = doc(customersCollection, data.customerId);

      const [metadataDoc, ...itemDocs] = await Promise.all([
        transaction.get(metadataRef),
        ...itemRefs.map(ref => transaction.get(ref)),
      ]);
      const customerDoc = await transaction.get(customerRef);

      if (!customerDoc.exists()) {
        throw new Error(`Customer with id ${data.customerId} does not exist!`);
      }

      const lastSaleNumber = (metadataDoc.data() as Metadata)?.lastSaleNumber || 0;
      const newSaleNumber = lastSaleNumber + 1;
      const saleId = `SALE-${String(newSaleNumber).padStart(4, '0')}`;

      let calculatedSubtotal = 0;
      let totalProductionCost = 0;
      const itemsWithPrices: SaleItem[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const itemDoc = itemDocs[i];
        const saleItem = data.items[i];

        if (!itemDoc.exists()) {
          throw new Error(`Item with id ${saleItem.itemId} does not exist!`);
        }
        const itemData = itemDoc.data() as Item;
        if (Number(itemData.stock) < Number(saleItem.quantity)) {
          throw new Error(`Not enough stock for ${itemData.title}. Available: ${itemData.stock}, Requested: ${saleItem.quantity}`);
        }

        const price = saleItem.price !== undefined && saleItem.price !== null ? Number(saleItem.price) : Number(itemData.sellingPrice);
        calculatedSubtotal += price * Number(saleItem.quantity);
        totalProductionCost += Number(itemData.productionPrice) * Number(saleItem.quantity);
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
        // Remove amountPaid and splitPaymentMethod for non-Split payments
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

      for (let i = 0; i < itemDocs.length; i++) {
        const saleItem = data.items[i];
        const newStock = Number(itemDocs[i].data()!.stock) - Number(saleItem.quantity);
        transaction.update(itemRefs[i], { stock: newStock });
      }

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
