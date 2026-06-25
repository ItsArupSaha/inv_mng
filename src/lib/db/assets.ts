'use server';

import {
  Timestamp,
  collection,
  doc,
  runTransaction
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Metadata } from '../types';

export async function addOfficeAsset(
    userId: string,
    data: {
      itemName: string;
      quantity: number;
      cost: number;
      paymentMethod: 'Cash' | 'Bank';
      date: Date;
    }
  ) {
    if (!db || !userId) return { success: false, error: 'Database not connected' };
  
    try {
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db!, 'users', userId);
        const metadataRef = doc(userRef, 'metadata', 'counters');
        const purchasesCollection = collection(userRef, 'purchases');
        const expensesCollection = collection(userRef, 'expenses');
  
        const metadataDoc = await transaction.get(metadataRef);
        let lastPurchaseNumber = (metadataDoc.data() as Metadata)?.lastPurchaseNumber || 0;
        const newPurchaseNumber = lastPurchaseNumber + 1;
        const purchaseId = `PUR-A-${String(newPurchaseNumber).padStart(4, '0')}`;
  
        const totalAmount = data.cost * data.quantity;
  
        const newPurchaseRef = doc(purchasesCollection);
        const purchaseData = {
          purchaseId,
          supplier: 'Asset Purchase',
          date: Timestamp.fromDate(data.date),
          dueDate: Timestamp.fromDate(data.date),
          items: [
            {
              itemName: data.itemName,
              categoryId: 'OFFICE_ASSET',
              categoryName: 'Office Asset',
              quantity: data.quantity,
              cost: data.cost,
            },
          ],
          totalAmount: totalAmount,
          paymentMethod: data.paymentMethod,
        };
        transaction.set(newPurchaseRef, purchaseData);
        transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });
  
        // Get expense counter for generating expense ID
        let lastExpenseNumber = (metadataDoc.data() as Metadata)?.lastExpenseNumber || 0;
        lastExpenseNumber += 1;
        const expenseId = `EXP-${String(lastExpenseNumber).padStart(4, '0')}`;
        
        const expenseData = {
          expenseId,
          description: `Asset Purchase: ${data.itemName}`,
          amount: totalAmount,
          date: Timestamp.fromDate(data.date),
          paymentMethod: data.paymentMethod,
        };
        transaction.set(doc(expensesCollection), expenseData);
        transaction.set(metadataRef, { lastExpenseNumber }, { merge: true });
  
        return { success: true };
      });
  
      revalidatePath('/purchases');
      revalidatePath('/expenses');
      return result;
    } catch (e) {
      console.error("Office asset creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

export async function addExistingAsset(
    userId: string,
    data: {
      itemName: string;
      quantity: number;
      value: number;
    }
  ): Promise<{ success: true } | { success: false; error: string }> {
    if (!db || !userId) return { success: false, error: 'Database not connected' };
  
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db!, 'users', userId);
        const metadataRef = doc(userRef, 'metadata', 'counters');
        const purchasesCollection = collection(userRef, 'purchases');
        const capitalCollection = collection(userRef, 'capital');
        
        const date = new Date();
  
        const metadataDoc = await transaction.get(metadataRef);
        let lastPurchaseNumber = (metadataDoc.data() as Metadata)?.lastPurchaseNumber || 0;
        const newPurchaseNumber = lastPurchaseNumber + 1;
        const purchaseId = `PUR-A-${String(newPurchaseNumber).padStart(4, '0')}`;
  
        const totalValue = data.value * data.quantity;
  
        const newPurchaseRef = doc(purchasesCollection);
        const purchaseData = {
          purchaseId,
          supplier: 'Existing Asset',
          date: Timestamp.fromDate(date),
          dueDate: Timestamp.fromDate(date),
          items: [
            {
              itemName: data.itemName,
              categoryId: 'OFFICE_ASSET',
              categoryName: 'Office Asset',
              quantity: data.quantity,
              cost: data.value,
            },
          ],
          totalAmount: totalValue,
          paymentMethod: 'N/A',
        };
        transaction.set(newPurchaseRef, purchaseData);
        transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });
        
        // Add to capital as owner's equity
        const capitalData = {
          source: 'Capital Adjustment',
          amount: totalValue,
          date: Timestamp.fromDate(date),
          paymentMethod: 'Asset', // Special type for non-cash/bank capital
          notes: `Existing asset added: ${data.quantity}x ${data.itemName}`,
        };
        transaction.set(doc(capitalCollection), capitalData);
      });
  
      revalidatePath('/items');
      return { success: true };
    } catch (e) {
      console.error("Existing asset creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}
