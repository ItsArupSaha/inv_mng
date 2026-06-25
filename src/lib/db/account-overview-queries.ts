'use server';

import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomers } from './customers';
import { getSales } from './sales';
import { getSalesReturns } from './sales-returns';
import { getAccountOverview } from './account-overview-main';

export async function getAccountBalances(userId: string) {
    const overview = await getAccountOverview(userId);
    return {
        cash: overview.cash,
        bank: overview.bank,
    };
}

export async function getCustomersWithDueBalanceAsOfDate(userId: string, asOfDate: Date) {
    if (!db || !userId) return [];

    // Ensure cutoff is End of Day
    const cutoffDate = asOfDate;
    cutoffDate.setHours(23, 59, 59, 999);
    const cutoffTs = Timestamp.fromDate(cutoffDate);

    const [allSales, allTransactionsData, allCustomers, allReturns] = await Promise.all([
        getSales(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getCustomers(userId),
        getSalesReturns(userId),
    ]);

    const allTransactions = allTransactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    const isBeforeOrOnCutoff = (date: any): boolean => {
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() <= cutoffTs.toMillis();
    };

    const filteredSales = allSales.filter((sale: any) => isBeforeOrOnCutoff(sale.date));
    const filteredTransactions = allTransactions.filter((t: any) => isBeforeOrOnCutoff(t.dueDate));
    const filteredReturns = allReturns.filter((ret: any) => isBeforeOrOnCutoff(ret.date));

    // Calculate balance for each customer
    const customersWithDue = allCustomers.map(customer => {
        let balance = customer.openingBalance || 0;

        // Add Sales logic
        filteredSales.filter((s: any) => s.customerId === customer.id).forEach((sale: any) => {
            balance += (sale.creditApplied || 0);

            if (sale.paymentMethod === 'Due') {
                balance += sale.total;
            } else if (sale.paymentMethod === 'Split') {
                const due = sale.total - (sale.amountPaid || 0);
                balance += due;
            }
        });

        // Subtract Payments logic
        filteredTransactions.filter((t: any) => t.customerId === customer.id).forEach((t: any) => {
            if (t.type === 'Receivable') {
                const description = t.description || '';
                if (description.startsWith('Payment from customer')) {
                    balance -= t.amount;
                }
            }
        });

        // Subtract Returns logic
        filteredReturns.filter((r: any) => r.customerId === customer.id).forEach((ret: any) => {
            balance -= ret.totalReturnValue;
        });

        return {
            ...customer,
            dueBalance: balance
        };
    }).filter(c => c.dueBalance > 0.01); // Filter out zero/negative balances, use small epsilon

    return customersWithDue;
}

/**
 * Get all pending payables as of a specific date.
 * Returns payables that were created on or before the asOfDate and were still Pending.
 */
export async function getPayablesAsOfDate(userId: string, asOfDate: Date) {
    if (!db || !userId) return [];

    // Ensure cutoff is End of Day
    const cutoffDate = new Date(asOfDate);
    cutoffDate.setHours(23, 59, 59, 999);
    const cutoffTs = Timestamp.fromDate(cutoffDate);

    const transactionsData = await getDocs(collection(db, 'users', userId, 'transactions'));
    const allTransactions = transactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    const isBeforeOrOnCutoff = (date: any): boolean => {
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() <= cutoffTs.toMillis();
    };

    // Filter to Payable type transactions created on or before cutoff date
    // We consider a payable "pending as of date" if it was created on or before that date
    // and either is still Pending OR was paid after the cutoff date
    const pendingPayablesAsOfDate = allTransactions.filter((t: any) => {
        if (t.type !== 'Payable') return false;
        if (!isBeforeOrOnCutoff(t.dueDate)) return false;

        // If it's currently pending, include it
        if (t.status === 'Pending') return true;

        // If it was paid, check if it was paid after the cutoff date
        // For now, we'll include all payables created before cutoff that are pending
        // A more accurate implementation would track payment date separately
        // But based on the current schema, we can only check status
        return t.status === 'Pending';
    });

    return pendingPayablesAsOfDate.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        dueDate: t.dueDate instanceof Timestamp ? t.dueDate.toDate().toISOString() : t.dueDate,
        status: t.status,
        type: t.type,
    }));
}
