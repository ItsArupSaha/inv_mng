'use server';

import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomers } from './customers';
import { getSales } from './sales';
import { getRawTransactions } from './ledger-docs';
import { getSalesReturns } from './sales-returns';
import { getAccountOverview } from './account-overview-main';

export async function getAccountBalances(userId: string) {
    const overview = await getAccountOverview(userId);
    return {
        cash: overview.cash,
        bank: overview.bank,
    };
}

export async function getPayablesAsOfDate(userId: string, asOfDate: Date) {
    if (!db || !userId) return [];

    // Ensure cutoff is End of Day
    const cutoffDate = new Date(asOfDate);
    cutoffDate.setHours(23, 59, 59, 999);
    const cutoffTs = Timestamp.fromDate(cutoffDate);

    const allTransactions = await getRawTransactions(userId);

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
