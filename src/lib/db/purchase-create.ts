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
import type { Item, Metadata, Purchase } from '../types';

export async function addPurchase(userId: string, data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: string }) {
  if (!db || !userId) return { success: false, error: 'Database not connected' };

  try {
      const result = await runTransaction(db, async (transaction) => {
          const userRef = doc(db!, 'users', userId);
          const metadataRef = doc(userRef, 'metadata', 'counters');
          const purchasesCollection = collection(userRef, 'purchases');
          const itemsCollection = collection(userRef, 'items');
          const expensesCollection = collection(userRef, 'expenses');
          const transactionsCollection = collection(userRef, 'transactions');
          
          const purchaseDate = new Date();

          const metadataDoc = await transaction.get(metadataRef);
          let lastPurchaseNumber = 0;
          if (metadataDoc.exists()) {
              lastPurchaseNumber = (metadataDoc.data() as Metadata).lastPurchaseNumber || 0;
          }
          const newPurchaseNumber = lastPurchaseNumber + 1;
          const purchaseId = `PUR-${String(newPurchaseNumber).padStart(4, '0')}`;
          
          let totalAmount = 0;
          for (const item of data.items) {
              totalAmount += item.cost * item.quantity;
          }
          const discountAmount = data.discountAmount || 0;
          const vatType = data.vatType || 'amount';
          const vatValue = data.vatValue || 0;
          const vatAmount = vatType === 'percentage' ? (totalAmount * vatValue) / 100 : vatValue;

          const newPurchaseRef = doc(purchasesCollection);
          const mappedItems = data.items.map(item => ({
              ...item,
              itemName: item.itemName.trim()
          }));
          const purchaseData = {
              ...data,
              items: mappedItems,
              purchaseId,
              date: Timestamp.fromDate(purchaseDate),
              dueDate: Timestamp.fromDate(new Date(data.dueDate)),
              totalAmount: totalAmount,
              discountAmount: discountAmount,
              vatType: vatType,
              vatValue: vatValue,
              vatAmount: vatAmount,
          };
          transaction.set(newPurchaseRef, purchaseData);
          transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });

          const factor = totalAmount > 0 ? (totalAmount + vatAmount - discountAmount) / totalAmount : 1;

          for (const item of mappedItems) {
              const trimmedName = item.itemName;
              const q = query(itemsCollection, where("title", "==", trimmedName));
              const bookSnapshot = await getDocs(q); 
              const capitalizedCost = Number(item.cost) * factor;

              if (!bookSnapshot.empty) {
                  const bookDoc = bookSnapshot.docs[0];
                  const bookData = bookDoc.data();
                  const currentStock = Number(bookData.stock) || 0;
                  const currentTotalValue = currentStock * (Number(bookData.productionPrice) || 0);
                  const newTotalValue = capitalizedCost * Number(item.quantity);
                  const newStock = currentStock + Number(item.quantity);
                  const newProductionPrice = newStock > 0 ? (currentTotalValue + newTotalValue) / newStock : 0;
                  
                   // Optionally keep the higher selling price or recalculate standard markup
                  const newSellingPrice = item.sellingPrice && item.sellingPrice > 0 
                                            ? item.sellingPrice 
                                            : Math.max(bookData.sellingPrice || 0, newProductionPrice * 1.5);
                  
                  const updateData: any = { 
                      stock: newStock,
                      productionPrice: newProductionPrice,
                      sellingPrice: newSellingPrice
                  };
                  if (item.medicineGroup) updateData.medicineGroup = item.medicineGroup;
                  if (item.company) updateData.company = item.company;
                  if (item.expiryDate) updateData.expiryDate = item.expiryDate;
                  if (item.location) updateData.location = item.location;

                  transaction.update(bookDoc.ref, updateData);
              } else {
                  const newItemRef = doc(itemsCollection);
                  const sellingPrice = item.sellingPrice && item.sellingPrice > 0 ? item.sellingPrice : capitalizedCost * 1.5;
                  
                  const newItemData: Omit<Item, 'id'> = {
                      title: trimmedName,
                      categoryId: item.categoryId,
                      categoryName: item.categoryName,
                      stock: item.quantity,
                      productionPrice: capitalizedCost,
                      sellingPrice: sellingPrice,
                  };

                  if (item.author) {
                      newItemData.author = item.author;
                  } else if (item.categoryName === 'Book') {
                      newItemData.author = 'Unknown';
                  }

                  if (item.medicineGroup) newItemData.medicineGroup = item.medicineGroup;
                  if (item.company) newItemData.company = item.company;
                  if (item.expiryDate) newItemData.expiryDate = item.expiryDate;
                  if (item.location) newItemData.location = item.location;

                  transaction.set(newItemRef, newItemData);
              }
          }

          // Get expense counter for generating expense IDs
          let lastExpenseNumber = (metadataDoc.data() as Metadata)?.lastExpenseNumber || 0;

          const finalAmount = totalAmount + vatAmount - discountAmount;

          if (finalAmount > 0) {
              if (data.paymentMethod === 'Cash' || data.paymentMethod === 'Bank') {
                  lastExpenseNumber += 1;
                  const expenseId = `EXP-${String(lastExpenseNumber).padStart(4, '0')}`;
                  const expenseData = {
                      expenseId,
                      description: `Payment for Purchase ${purchaseId}`,
                      amount: finalAmount,
                      date: Timestamp.fromDate(new Date()),
                      paymentMethod: data.paymentMethod,
                  };
                  transaction.set(doc(expensesCollection), expenseData);
              } else if (data.paymentMethod === 'Split') {
                  const amountPaid = data.amountPaid || 0;
                  const payableAmount = finalAmount - amountPaid;

                  if (amountPaid > 0) {
                      lastExpenseNumber += 1;
                      const expenseId = `EXP-${String(lastExpenseNumber).padStart(4, '0')}`;
                      const expenseData = {
                          expenseId,
                          description: `Partial payment for Purchase ${purchaseId}`,
                          amount: amountPaid,
                          date: Timestamp.fromDate(new Date()),
                          paymentMethod: data.splitPaymentMethod,
                      };
                      transaction.set(doc(expensesCollection), expenseData);
                  }

                  if (payableAmount > 0) {
                      const payableData = {
                          description: `Balance for Purchase ${purchaseId} from ${data.supplier}`,
                          amount: payableAmount,
                          dueDate: Timestamp.fromDate(new Date(data.dueDate)),
                          status: 'Pending' as const,
                          type: 'Payable' as const,
                      };
                      transaction.set(doc(transactionsCollection), payableData);
                  }
              } else if (data.paymentMethod === 'Due') {
                  const payableData = {
                      description: `Purchase ${purchaseId} from ${data.supplier}`,
                      amount: finalAmount,
                      dueDate: Timestamp.fromDate(new Date(data.dueDate)),
                      status: 'Pending' as const,
                      type: 'Payable' as const,
                  };
                  transaction.set(doc(transactionsCollection), payableData);
              }
          }
          
          // Update metadata with new expense counter if it changed
          if (lastExpenseNumber > ((metadataDoc.data() as Metadata)?.lastExpenseNumber || 0)) {
              transaction.set(metadataRef, { lastExpenseNumber }, { merge: true });
          }

          return { success: true, purchase: { id: newPurchaseRef.id, ...purchaseData, date: purchaseDate.toISOString(), dueDate: data.dueDate } };
      });

      revalidatePath('/purchases');
      revalidatePath('/items');
      revalidatePath('/payables');
      revalidatePath('/expenses');
      revalidatePath('/dashboard');
      return result;
  } catch (e) {
      console.error("Purchase creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
