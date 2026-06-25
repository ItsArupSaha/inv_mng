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
import { docToTransaction } from './utils';

export async function addPayment(userId: string, data: { customerId: string, amount: number, paymentMethod: 'Cash' | 'Bank' }) {
  if (!db || !userId) throw new Error("Database not configured.");

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db!, 'users', userId);
      const customersCollection = collection(userRef, 'customers');
      const transactionsCollection = collection(userRef, 'transactions');

      const customerRef = doc(customersCollection, data.customerId);
      const customerDoc = await transaction.get(customerRef);

      if (!customerDoc.exists()) {
        throw new Error("Customer not found.");
      }

      const currentDue = customerDoc.data().dueBalance || 0;
      const newDue = currentDue - data.amount;

      transaction.update(customerRef, { dueBalance: newDue });

      const paymentTransactionRef = doc(transactionsCollection);
      const paymentTransactionData = {
        description: `Payment from customer`,
        amount: data.amount,
        dueDate: Timestamp.fromDate(new Date()),
        status: 'Paid' as const,
        type: 'Receivable' as const,
        paymentMethod: data.paymentMethod,
        customerId: data.customerId,
        recognizedProfit: 0,
      };

      let amountToSettle = data.amount;
      let totalRecognizedProfit = 0;

      const receivablesQuery = query(
        transactionsCollection,
        where('type', '==', 'Receivable'),
        where('status', '==', 'Pending'),
        where('customerId', '==', data.customerId)
      );

      const pendingDocs = await getDocs(receivablesQuery);

      const sortedPendingDocs = pendingDocs.docs
        .map(doc => ({ doc, data: docToTransaction(doc) }))
        .sort((a, b) => new Date(a.data.dueDate).getTime() - new Date(b.data.dueDate).getTime());

      for (const { doc: docSnap, data: receivable } of sortedPendingDocs) {
        if (amountToSettle <= 0) break;

        const receivableRef = doc(transactionsCollection, docSnap.id);
        const receivableAmount = receivable.amount;
        const remainingProfit = receivable.remainingProfit || 0;

        const paymentForThisReceivable = Math.min(amountToSettle, receivableAmount);
        const profitToRecognize = remainingProfit > 0 && receivableAmount > 0
          ? remainingProfit * (paymentForThisReceivable / receivableAmount)
          : 0;

        totalRecognizedProfit += profitToRecognize;

        if (paymentForThisReceivable < receivableAmount) {
          // Partially paying off this receivable
          transaction.update(receivableRef, {
            amount: receivableAmount - paymentForThisReceivable,
            remainingProfit: remainingProfit - profitToRecognize,
          });
        } else {
          // Fully paying off this receivable — hide from history to avoid duplicates with the payment trace
          transaction.update(receivableRef, {
            status: 'Paid',
            remainingProfit: 0,
            isHiddenFromHistory: true,
          });
        }
        amountToSettle -= paymentForThisReceivable;
      }

      // Set the total recognized profit on the main payment transaction
      paymentTransactionData.recognizedProfit = totalRecognizedProfit;
      transaction.set(paymentTransactionRef, paymentTransactionData);

      return { success: true };
    });

    revalidatePath('/receivables');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    if (data.customerId) {
      revalidatePath(`/customers/${data.customerId}`);
    }
    return result;

  } catch (e) {
    console.error("Payment processing failed: ", e);
    throw e instanceof Error ? e : new Error('An unknown error occurred during payment processing.');
  }
}

export async function payPayable(userId: string, data: { transactionId: string, amount: number, paymentMethod: 'Cash' | 'Bank' }) {
  if (!db || !userId) throw new Error("Database not configured.");

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db!, 'users', userId);
      const metadataRef = doc(userRef, 'metadata', 'counters');
      const expensesCollection = collection(userRef, 'expenses');
      const transactionsCollection = collection(userRef, 'transactions');

      const payableRef = doc(transactionsCollection, data.transactionId);

      // FIREBASE RULE: All reads must happen before any writes
      const payableDoc = await transaction.get(payableRef);
      const metadataDoc = await transaction.get(metadataRef);

      if (!payableDoc.exists()) {
        throw new Error("Payable transaction not found.");
      }

      const payableData = payableDoc.data();
      if (payableData.type !== 'Payable' || payableData.status !== 'Pending') {
        throw new Error("Transaction is not a pending payable.");
      }

      const currentAmount = Number(payableData.amount) || 0;
      const amountToPay = Number(data.amount) || 0;

      if (amountToPay > currentAmount) {
        throw new Error("Payment amount cannot exceed the payable amount.");
      }

      // 1. Add an Expense config (no writes yet)
      let lastExpenseNumber = 0;
      if (metadataDoc.exists()) {
        lastExpenseNumber = (metadataDoc.data() as any).lastExpenseNumber || 0;
      }
      const newExpenseNumber = lastExpenseNumber + 1;
      const expenseId = `EXP-${String(newExpenseNumber).padStart(4, '0')}`;
      const newExpenseRef = doc(expensesCollection);
      const paymentTransactionRef = doc(transactionsCollection);

      // --- WRITES START HERE ---

      // 2. Update the payable to decrease amount or set to Paid
      if (amountToPay < currentAmount) {
        transaction.update(payableRef, {
          amount: currentAmount - amountToPay,
        });
      } else {
        transaction.update(payableRef, {
          status: 'Paid',
          isHiddenFromHistory: true, // Prevents duplicate showing in Paid History since we emit a trace
        });
      }

      // 3. Write expenses and config
      transaction.set(newExpenseRef, {
        expenseId,
        description: `Paid Payable: ${payableData.description}`,
        amount: data.amount,
        date: Timestamp.fromDate(new Date()),
        paymentMethod: data.paymentMethod,
      });
      transaction.set(metadataRef, { lastExpenseNumber: newExpenseNumber }, { merge: true });

      // 4. Create a Paid trace transaction for the exact payment
      transaction.set(paymentTransactionRef, {
        description: `Payment for: ${payableData.description}`,
        amount: data.amount,
        dueDate: Timestamp.fromDate(new Date()),
        status: 'Paid',
        type: 'Payable',
        paymentMethod: data.paymentMethod,
      });

      return { success: true };
    });

    revalidatePath('/payables');
    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    revalidatePath('/reports');
    return result;

  } catch (e) {
    console.error("Payable payment processing failed: ", e);
    throw e instanceof Error ? e : new Error('An unknown error occurred during payable processing.');
  }
}

export async function refundCustomerOverpayment(userId: string, data: { customerId: string, amount: number, paymentMethod: 'Cash' | 'Bank' }) {
  if (!db || !userId) throw new Error("Database not configured.");

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db!, 'users', userId);
      const metadataRef = doc(userRef, 'metadata', 'counters');
      const customersCollection = collection(userRef, 'customers');
      const expensesCollection = collection(userRef, 'expenses');
      const transactionsCollection = collection(userRef, 'transactions');

      const customerRef = doc(customersCollection, data.customerId);

      // FIREBASE RULE: All reads must happen before any writes
      const customerDoc = await transaction.get(customerRef);
      const metadataDoc = await transaction.get(metadataRef);

      if (!customerDoc.exists()) {
        throw new Error("Customer not found.");
      }

      const currentDue = Number(customerDoc.data().dueBalance) || 0;
      if (currentDue >= 0) {
        throw new Error("Customer does not have a negative (overpaid) balance.");
      }

      const maxRefundableAmount = Math.abs(currentDue);
      const amountToRefund = Number(data.amount) || 0;

      if (amountToRefund > maxRefundableAmount) {
        throw new Error("Refund amount exceeds the overpaid balance.");
      }

      // 1. Prepare expense config
      let lastExpenseNumber = 0;
      if (metadataDoc.exists()) {
        lastExpenseNumber = (metadataDoc.data() as any).lastExpenseNumber || 0;
      }
      const newExpenseNumber = lastExpenseNumber + 1;
      const expenseId = `EXP-${String(newExpenseNumber).padStart(4, '0')}`;
      const newExpenseRef = doc(expensesCollection);
      const paymentTransactionRef = doc(transactionsCollection);

      // --- WRITES START HERE ---

      // 2. Update customer's dueBalance back towards 0
      const newDue = currentDue + amountToRefund;
      transaction.update(customerRef, { dueBalance: newDue });

      // 3. Write Expenses
      transaction.set(newExpenseRef, {
        expenseId,
        description: `Customer Refund: ${customerDoc.data().name}`,
        amount: data.amount,
        date: Timestamp.fromDate(new Date()),
        paymentMethod: data.paymentMethod,
      });
      transaction.set(metadataRef, { lastExpenseNumber: newExpenseNumber }, { merge: true });

      // 4. Optional: Add a Paid Payable transaction as a log
      transaction.set(paymentTransactionRef, {
        description: `Refund to customer: ${customerDoc.data().name}`,
        amount: data.amount,
        dueDate: Timestamp.fromDate(new Date()),
        status: 'Paid',
        type: 'Payable',
        paymentMethod: data.paymentMethod,
        customerId: data.customerId,
      });

      return { success: true };
    });

    revalidatePath('/payables');
    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    revalidatePath('/reports');
    revalidatePath(`/customers/${data.customerId}`);

    return result;

  } catch (e) {
    console.error("Refund processing failed: ", e);
    throw e instanceof Error ? e : new Error('An unknown error occurred during refund processing.');
  }
}
