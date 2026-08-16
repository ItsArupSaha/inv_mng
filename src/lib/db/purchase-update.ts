'use server';

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  type CollectionReference,
  type Transaction
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Metadata, Purchase, PurchaseItem } from '../types';
import { resolveIsSalable } from '../item-flags';
import {
  computePurchaseTotals,
  planPurchaseSettlements,
  reconcileItemState,
  type SettlementWrite
} from './purchase-calculation';

function itemKey(item: { itemName: string; expiryDate?: string }): string {
  return `${item.itemName.trim()}||${item.expiryDate || ''}`;
}

/**
 * Ledger docs written since the `purchaseId` field existed link back by exact
 * field equality. Older docs are matched against the exact description
 * templates historically written for this purchase — equality, never
 * substring, so PUR-00001 entries can never attach to PUR-0001.
 */
function makePurchaseLedgerMatcher(purchaseId: string, suppliers: string[]) {
  const legacyDescriptions = new Set<string>([
    `Payment for Purchase ${purchaseId}`,
    `Partial payment for Purchase ${purchaseId}`,
  ]);
  for (const supplier of suppliers) {
    legacyDescriptions.add(`Purchase ${purchaseId} from ${supplier}`);
    legacyDescriptions.add(`Balance for Purchase ${purchaseId} from ${supplier}`);
  }

  return (data: { purchaseId?: string; description?: string }): boolean =>
    data.purchaseId === purchaseId || legacyDescriptions.has(data.description || '');
}

function applySettlementWrite(
  transaction: Transaction,
  write: SettlementWrite,
  expensesCollection: CollectionReference,
  transactionsCollection: CollectionReference,
  dueDate: Date
) {
  if (write.kind === 'expense') {
    transaction.set(doc(expensesCollection), {
      ...write.data,
      date: Timestamp.fromDate(new Date()),
    });
  } else {
    transaction.set(doc(transactionsCollection), {
      ...write.data,
      dueDate: Timestamp.fromDate(dueDate),
    });
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
      const isPurchaseLedgerDoc = makePurchaseLedgerMatcher(purchaseId, [
        oldPurchase.supplier,
        data.supplier,
      ]);

      // Query related expenses and payables
      const expensesCollection = collection(userRef, 'expenses');
      const expensesSnap = await getDocs(expensesCollection);
      const relatedExpenseRefs = expensesSnap.docs
          .filter(docSnap => isPurchaseLedgerDoc(docSnap.data()))
          .map(docSnap => docSnap.ref);

      const transactionsCollection = collection(userRef, 'transactions');
      const transactionsSnap = await getDocs(transactionsCollection);
      const relatedTransactionRefs = transactionsSnap.docs
          .filter(docSnap => isPurchaseLedgerDoc(docSnap.data()))
          .map(docSnap => docSnap.ref);

      // Find all items affected by either old or new purchase, keyed by title + expiry
      const itemsCollection = collection(userRef, 'items');
      const itemKeys = new Set<string>();
      oldPurchase.items.forEach(item => itemKeys.add(itemKey(item)));
      data.items.forEach(item => itemKeys.add(itemKey(item)));

      const itemDocsMap: Record<string, { ref: any; data: any }> = {};
      for (const key of itemKeys) {
          const [name, expiryDate] = key.split('||');
          let q: ReturnType<typeof query> = query(itemsCollection, where("title", "==", name));
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

      const { totalAmount, vatAmount, finalAmount, factor } = computePurchaseTotals({
          items: data.items,
          discountAmount: data.discountAmount,
          vatType: data.vatType,
          vatValue: data.vatValue,
      });

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

          // For each affected key, reconcile stock/cost against old and new invoice lines
          const oldItemsByKey: Record<string, PurchaseItem[]> = {};
          for (const oldItem of oldPurchase.items) {
              const key = itemKey(oldItem);
              (oldItemsByKey[key] ||= []).push(oldItem);
          }

          for (const key of itemKeys) {
              const [name, expiryDate] = key.split('||');
              const currentData = currentItemDataMap[key];
              const oldLines = oldItemsByKey[key] || [];
              const newLines = data.items.filter(i => itemKey(i) === key);

              const reconciled = reconcileItemState(
                  currentData ? (Number(currentData.stock) || 0) : 0,
                  currentData ? (Number(currentData.productionPrice) || 0) : 0,
                  oldLines.map(i => ({ quantity: i.quantity, cost: i.cost })),
                  newLines.map(i => ({ quantity: i.quantity, cost: i.cost * factor }))
              );

              const itemRef = itemDocsMap[key]?.ref;
              const newItem = newLines[0];

              if (itemRef && currentData) {
                  const salable = resolveIsSalable({ isSalable: currentData.isSalable, categoryName: currentData.categoryName });
                  const updateData: any = {
                      stock: reconciled.stock,
                      productionPrice: reconciled.productionPrice,
                      isSalable: salable,
                      ignoredWarning: false
                  };

                  if (newItem) {
                      if (salable && newItem.sellingPrice && newItem.sellingPrice > 0) {
                          updateData.sellingPrice = newItem.sellingPrice;
                      }
                      if (!salable) updateData.sellingPrice = 0;
                      if (newItem.medicineGroup) updateData.medicineGroup = newItem.medicineGroup;
                      if (newItem.company) updateData.company = newItem.company;
                      if (newItem.expiryDate) updateData.expiryDate = newItem.expiryDate;
                      if (newItem.location) updateData.location = newItem.location;
                  }

                  transaction.update(itemRef, updateData);
              } else if (newItem) {
                  const newItemRef = doc(itemsCollection);
                  const capitalizedCost = newItem.cost * factor;
                  const salable = resolveIsSalable({ categoryName: newItem.categoryName });
                  const sellingPrice = salable
                    ? (newItem.sellingPrice && newItem.sellingPrice > 0 ? newItem.sellingPrice : capitalizedCost * 1.5)
                    : 0;
                  const newItemData: any = {
                      title: name,
                      categoryId: newItem.categoryId,
                      categoryName: newItem.categoryName,
                      stock: reconciled.stock,
                      productionPrice: reconciled.productionPrice,
                      sellingPrice: sellingPrice,
                      isSalable: salable,
                      ignoredWarning: false
                  };
                  if (newItem.medicineGroup) newItemData.medicineGroup = newItem.medicineGroup;
                  if (newItem.company) newItemData.company = newItem.company;
                  if (newItem.expiryDate) newItemData.expiryDate = newItem.expiryDate;
                  if (newItem.location) newItemData.location = newItem.location;

                  transaction.set(newItemRef, newItemData);
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
              discountAmount: data.discountAmount || 0,
              vatType: data.vatType || 'amount',
              vatValue: data.vatValue || 0,
              vatAmount,
          };
          transaction.set(purchaseRef, purchaseData);

          // Regenerate expense/payable writes for the edited purchase
          const nextExpenseNumber = (metadataDoc.data() as Metadata)?.lastExpenseNumber || 0;
          const settlement = planPurchaseSettlements({
              purchaseId,
              supplier: data.supplier,
              finalAmount,
              paymentMethod: data.paymentMethod,
              amountPaid: data.amountPaid,
              splitPaymentMethod: data.splitPaymentMethod,
              nextExpenseNumber,
          });
          for (const write of settlement.writes) {
              applySettlementWrite(transaction, write, expensesCollection, transactionsCollection, new Date(data.dueDate));
          }

          if (settlement.lastExpenseNumber > nextExpenseNumber) {
              transaction.set(metadataRef, { lastExpenseNumber: settlement.lastExpenseNumber }, { merge: true });
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
