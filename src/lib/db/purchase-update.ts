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
import type { Metadata, Purchase, Item } from '../types';

export async function updatePurchase(
  userId: string,
  purchaseDocId: string,
  data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: string }
) {
  if (!db || !userId || !purchaseDocId) return { success: false, error: 'Database not connected or invalid ID' };

  try {
      const userRef = doc(db, 'users', userId);
      const purchasesCollection = collection(userRef, 'purchases');
      const purchaseRef = doc(purchasesCollection, purchaseDocId);
      
      const oldPurchaseSnap = await getDoc(purchaseRef);
      if (!oldPurchaseSnap.exists()) {
          return { success: false, error: 'Purchase not found' };
      }
      
      const oldPurchase = oldPurchaseSnap.data() as Purchase;
      const purchaseId = oldPurchase.purchaseId;
      
      // Query related expenses
      const expensesCollection = collection(userRef, 'expenses');
      const expensesSnap = await getDocs(expensesCollection);
      const relatedExpenseRefs = expensesSnap.docs
          .filter(docSnap => docSnap.data().description?.includes(purchaseId))
          .map(docSnap => docSnap.ref);

      // Query related transactions
      const transactionsCollection = collection(userRef, 'transactions');
      const transactionsSnap = await getDocs(transactionsCollection);
      const relatedTransactionRefs = transactionsSnap.docs
          .filter(docSnap => docSnap.data().description?.includes(purchaseId))
          .map(docSnap => docSnap.ref);

      // Find all items affected by either old or new purchase, keyed by title + expiry
      const itemsCollection = collection(userRef, 'items');
      const itemKeys = new Set<string>();
      oldPurchase.items.forEach(item => {
          itemKeys.add(`${item.itemName.trim()}||${item.expiryDate || ''}`);
      });
      data.items.forEach(item => {
          itemKeys.add(`${item.itemName.trim()}||${item.expiryDate || ''}`);
      });

      const itemDocsMap: Record<string, { ref: any; data: any }> = {};
      for (const key of itemKeys) {
          const [name, expiryDate] = key.split('||');
          let q = query(itemsCollection, where("title", "==", name));
          if (expiryDate) {
              q = query(itemsCollection, where("title", "==", name), where("expiryDate", "==", expiryDate));
          }
          const snap = await getDocs(q);
          if (!snap.empty) {
              itemDocsMap[key] = {
                  ref: snap.docs[0].ref,
                  data: snap.docs[0].data(),
              };
          }
      }

      // Calculate new purchase total, discount and VAT first
      let totalAmount = 0;
      for (const item of data.items) {
          totalAmount += item.cost * item.quantity;
      }
      const discountAmount = data.discountAmount || 0;
      const vatType = data.vatType || 'amount';
      const vatValue = data.vatValue || 0;
      const vatAmount = vatType === 'percentage' ? (totalAmount * vatValue) / 100 : vatValue;
      const finalAmount = totalAmount + vatAmount - discountAmount;
      const factor = totalAmount > 0 ? (totalAmount + vatAmount - discountAmount) / totalAmount : 1;

      const result = await runTransaction(db, async (transaction) => {
          const metadataRef = doc(userRef, 'metadata', 'counters');
          const metadataDoc = await transaction.get(metadataRef);

          // Get current state of each item inside the transaction to prevent race conditions
          const currentItemDataMap: Record<string, any> = {};
          for (const key of itemKeys) {
              const itemRef = itemDocsMap[key]?.ref;
              if (itemRef) {
                  const snap = await transaction.get(itemRef);
                  if (snap.exists()) {
                      currentItemDataMap[key] = snap.data();
                  }
              }
          }

          // Calculate intermediate state (after subtracting old purchase quantities & value)
          const intermediateItems: Record<string, { stock: number; totalValue: number }> = {};
          for (const key of itemKeys) {
              const currentData = currentItemDataMap[key];
              if (currentData) {
                  const stock = Number(currentData.stock) || 0;
                  const price = Number(currentData.productionPrice) || 0;
                  intermediateItems[key] = {
                      stock,
                      totalValue: stock * price,
                  };
              } else {
                  intermediateItems[key] = {
                      stock: 0,
                      totalValue: 0,
                  };
              }
          }

          for (const oldItem of oldPurchase.items) {
              const key = `${oldItem.itemName.trim()}||${oldItem.expiryDate || ''}`;
              const state = intermediateItems[key];
              if (state) {
                  const oldTotal = oldItem.quantity * oldItem.cost;
                  state.stock = Math.max(0, state.stock - oldItem.quantity);
                  state.totalValue = Math.max(0, state.totalValue - oldTotal);
              }
          }

          // Apply new purchase quantities & value to the intermediate state
          for (const newItem of data.items) {
              const key = `${newItem.itemName.trim()}||${newItem.expiryDate || ''}`;
              const state = intermediateItems[key];
              const capitalizedCost = newItem.cost * factor;
              if (state) {
                  const newTotal = newItem.quantity * capitalizedCost;
                  state.stock += newItem.quantity;
                  state.totalValue += newTotal;
              } else {
                  intermediateItems[key] = {
                      stock: newItem.quantity,
                      totalValue: newItem.quantity * capitalizedCost,
                  };
              }
          }

          // Update items in database
          for (const key of itemKeys) {
              const [name, expiryDate] = key.split('||');
              const state = intermediateItems[key];
              const finalStock = state.stock;
              const finalProductionPrice = finalStock > 0 ? state.totalValue / finalStock : 0;

              const itemRef = itemDocsMap[key]?.ref;
              const currentData = currentItemDataMap[key];

              if (itemRef && currentData) {
                  const updateData: any = {
                      stock: finalStock,
                      productionPrice: finalProductionPrice,
                  };

                  const newItem = data.items.find(i => `${i.itemName.trim()}||${i.expiryDate || ''}` === key);
                  if (newItem) {
                      const catNameLower = (newItem.categoryName || '').toLowerCase();
                      const isAssetOrSurgical = catNameLower === 'assets' || catNameLower === 'surgicals';
                      if (isAssetOrSurgical) {
                          updateData.sellingPrice = 0;
                      } else if (newItem.sellingPrice && newItem.sellingPrice > 0) {
                          updateData.sellingPrice = newItem.sellingPrice;
                      }
                      if (newItem.medicineGroup) updateData.medicineGroup = newItem.medicineGroup;
                      if (newItem.company) updateData.company = newItem.company;
                      if (newItem.expiryDate) updateData.expiryDate = newItem.expiryDate;
                      if (newItem.location) updateData.location = newItem.location;
                  }

                  transaction.update(itemRef, updateData);
              } else {
                  const newItem = data.items.find(i => `${i.itemName.trim()}||${i.expiryDate || ''}` === key);
                  if (newItem) {
                      const newItemRef = doc(itemsCollection);
                      const capitalizedCost = newItem.cost * factor;
                      const catNameLower = (newItem.categoryName || '').toLowerCase();
                      const isAssetOrSurgical = catNameLower === 'assets' || catNameLower === 'surgicals';
                      const sellingPrice = isAssetOrSurgical ? 0 : (newItem.sellingPrice && newItem.sellingPrice > 0 ? newItem.sellingPrice : capitalizedCost * 1.5);
                      const newItemData: any = {
                          title: name,
                          categoryId: newItem.categoryId,
                          categoryName: newItem.categoryName,
                          stock: finalStock,
                          productionPrice: finalProductionPrice,
                          sellingPrice: sellingPrice,
                      };
                      if (newItem.author) {
                          newItemData.author = newItem.author;
                      } else if (newItem.categoryName === 'Book') {
                          newItemData.author = 'Unknown';
                      }
                      if (newItem.medicineGroup) newItemData.medicineGroup = newItem.medicineGroup;
                      if (newItem.company) newItemData.company = newItem.company;
                      if (newItem.expiryDate) newItemData.expiryDate = newItem.expiryDate;
                      if (newItem.location) newItemData.location = newItem.location;

                      transaction.set(newItemRef, newItemData);
                  }
              }
          }

          // Delete old expenses and transactions
          relatedExpenseRefs.forEach(ref => transaction.delete(ref));
          relatedTransactionRefs.forEach(ref => transaction.delete(ref));

          const mappedItems = data.items.map(item => ({
              ...item,
              itemName: item.itemName.trim()
          }));
          // Set updated purchase data
          const purchaseData = {
              ...data,
              items: mappedItems,
              purchaseId,
              date: oldPurchase.date, // keep original date
              dueDate: Timestamp.fromDate(new Date(data.dueDate)),
              totalAmount,
              discountAmount,
              vatType,
              vatValue,
              vatAmount,
          };
          transaction.set(purchaseRef, purchaseData);

          // Generate new expense or transaction if needed
          let lastExpenseNumber = (metadataDoc.data() as Metadata)?.lastExpenseNumber || 0;
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

          if (lastExpenseNumber > ((metadataDoc.data() as Metadata)?.lastExpenseNumber || 0)) {
              transaction.set(metadataRef, { lastExpenseNumber }, { merge: true });
          }

          return { success: true };
      });

      revalidatePath('/purchases');
      revalidatePath('/items');
      revalidatePath('/payables');
      revalidatePath('/expenses');
      revalidatePath('/dashboard');
      return result;
  } catch (e) {
      console.error("Purchase update failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
