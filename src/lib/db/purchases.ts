
'use server';

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Item, Metadata, Purchase } from '../types';
import { docToPurchase } from './utils';

// --- Purchases Actions ---
export async function getPurchases(userId: string): Promise<Purchase[]> {
    if (!db || !userId) return [];
    const purchasesCollection = collection(db, 'users', userId, 'purchases');
    const snapshot = await getDocs(query(purchasesCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(docToPurchase);
}

export async function getPurchasesPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ purchases: Purchase[], hasMore: boolean }> {
  if (!db || !userId) return { purchases: [], hasMore: false };

  const purchasesCollection = collection(db, 'users', userId, 'purchases');
  let q = query(
      purchasesCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(purchasesCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const purchases = snapshot.docs.map(docToPurchase);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(purchasesCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { purchases, hasMore };
}

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

      // Find all items affected by either old or new purchase
      const itemsCollection = collection(userRef, 'items');
      const itemNames = new Set<string>();
      oldPurchase.items.forEach(item => itemNames.add(item.itemName.trim()));
      data.items.forEach(item => itemNames.add(item.itemName.trim()));

      const itemDocsMap: Record<string, { ref: any; data: any }> = {};
      for (const name of itemNames) {
          const q = query(itemsCollection, where("title", "==", name));
          const snap = await getDocs(q);
          if (!snap.empty) {
              itemDocsMap[name] = {
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
          for (const name of itemNames) {
              const itemRef = itemDocsMap[name]?.ref;
              if (itemRef) {
                  const snap = await transaction.get(itemRef);
                  if (snap.exists()) {
                      currentItemDataMap[name] = snap.data();
                  }
              }
          }

          // Calculate intermediate state (after subtracting old purchase quantities & value)
          const intermediateItems: Record<string, { stock: number; totalValue: number }> = {};
          for (const name of itemNames) {
              const currentData = currentItemDataMap[name];
              if (currentData) {
                  const stock = Number(currentData.stock) || 0;
                  const price = Number(currentData.productionPrice) || 0;
                  intermediateItems[name] = {
                      stock,
                      totalValue: stock * price,
                  };
              } else {
                  intermediateItems[name] = {
                      stock: 0,
                      totalValue: 0,
                  };
              }
          }

          for (const oldItem of oldPurchase.items) {
              const state = intermediateItems[oldItem.itemName];
              if (state) {
                  const oldTotal = oldItem.quantity * oldItem.cost;
                  state.stock = Math.max(0, state.stock - oldItem.quantity);
                  state.totalValue = Math.max(0, state.totalValue - oldTotal);
              }
          }

          // Apply new purchase quantities & value to the intermediate state
          for (const newItem of data.items) {
              const state = intermediateItems[newItem.itemName];
              const capitalizedCost = newItem.cost * factor;
              if (state) {
                  const newTotal = newItem.quantity * capitalizedCost;
                  state.stock += newItem.quantity;
                  state.totalValue += newTotal;
              } else {
                  intermediateItems[newItem.itemName] = {
                      stock: newItem.quantity,
                      totalValue: newItem.quantity * capitalizedCost,
                  };
              }
          }

          // Update items in database
          for (const name of itemNames) {
              const state = intermediateItems[name];
              const finalStock = state.stock;
              const finalProductionPrice = finalStock > 0 ? state.totalValue / finalStock : 0;

              const itemRef = itemDocsMap[name]?.ref;
              const currentData = currentItemDataMap[name];

              if (itemRef && currentData) {
                  const updateData: any = {
                      stock: finalStock,
                      productionPrice: finalProductionPrice,
                  };

                  const newItem = data.items.find(i => i.itemName === name);
                  if (newItem) {
                      if (newItem.sellingPrice && newItem.sellingPrice > 0) updateData.sellingPrice = newItem.sellingPrice;
                      if (newItem.medicineGroup) updateData.medicineGroup = newItem.medicineGroup;
                      if (newItem.company) updateData.company = newItem.company;
                      if (newItem.expiryDate) updateData.expiryDate = newItem.expiryDate;
                      if (newItem.location) updateData.location = newItem.location;
                  }

                  transaction.update(itemRef, updateData);
              } else {
                  const newItem = data.items.find(i => i.itemName === name);
                  if (newItem) {
                      const newItemRef = doc(itemsCollection);
                      const capitalizedCost = newItem.cost * factor;
                      const sellingPrice = newItem.sellingPrice && newItem.sellingPrice > 0 ? newItem.sellingPrice : capitalizedCost * 1.5;
                      const newItemData: any = {
                          title: newItem.itemName,
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
