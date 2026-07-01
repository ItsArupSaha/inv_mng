'use server';

import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomers } from './customers';
import { getExpenses } from './expenses';
import { getItems } from './items';
import { getPurchases } from './purchases';
import { getSales } from './sales';
import { getSalesReturns } from './sales-returns';
import {
  toNum,
  calculateCashAndBank,
  calculateStockAndAssets,
  calculateReceivables,
} from './account-overview-helpers';


export async function getAccountOverview(userId: string, asOfDate?: Date) {
    if (!db) {
        throw new Error("Database not connected");
    }

    const cutoffTimestamp = asOfDate ? Timestamp.fromDate(asOfDate) : undefined;

    const [allItems, allSales, allExpenses, allTransactionsData, allPurchases, capitalData, allCustomers, transfersData, donationsData, allReturns] = await Promise.all([
        getItems(userId),
        getSales(userId),
        getExpenses(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getPurchases(userId),
        getDocs(collection(db, 'users', userId, 'capital')),
        getCustomers(userId),
        getDocs(collection(db, 'users', userId, 'transfers')),
        getDocs(collection(db, 'users', userId, 'donations')),
        getSalesReturns(userId),
    ]);

    const allTransactions = allTransactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allCapital = capitalData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allDonations = donationsData.docs.map(doc => doc.data());
    const allTransfers = transfersData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    const isBeforeOrOnCutoff = (date: any): boolean => {
        if (!asOfDate) return true;
        if (!date) return false;

        // Ensure cutoff is End of Day
        const cutoff = new Date(asOfDate);
        cutoff.setHours(23, 59, 59, 999);
        const cutoffTs = Timestamp.fromDate(cutoff);

        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() <= cutoffTs.toMillis();
    };

    const filteredCapital = allCapital.filter((capital: any) =>
        capital.source === 'Initial Capital' || isBeforeOrOnCutoff(capital.date)
    );
    const filteredDonations = allDonations.filter((donation: any) => isBeforeOrOnCutoff(donation.date));
    const filteredSales = allSales.filter((sale: any) => isBeforeOrOnCutoff(sale.date));
    const filteredExpenses = allExpenses.filter((expense: any) => isBeforeOrOnCutoff(expense.date));
    const filteredTransfers = allTransfers.filter((transfer: any) => isBeforeOrOnCutoff(transfer.date));
    const filteredPurchases = allPurchases.filter((purchase: any) => isBeforeOrOnCutoff(purchase.date));
    const filteredTransactions = allTransactions.filter((t: any) => isBeforeOrOnCutoff(t.dueDate));
    const filteredReturns = allReturns.filter((ret: any) => isBeforeOrOnCutoff(ret.date));

    const paidTransactionsUpToCutoff = filteredTransactions.filter((t: any) => t.status === 'Paid');

    /** Payables from purchases: description contains purchase id (see purchases.ts). PUR-0001 and PUR-A-0001 both match PUR-[^\s]+. */
    const parsePayablePurchaseId = (description: string): string | null => {
        const d = description || '';
        const balanceMatch = d.match(/Balance for Purchase\s+(PUR-[^\s]+)/i);
        if (balanceMatch) return balanceMatch[1];
        const purchaseMatch = d.match(/Purchase\s+(PUR-[^\s]+)/i);
        if (purchaseMatch) return purchaseMatch[1];
        return null;
    };

    /**
     * For a paid payable, find the payment trace transaction to determine when it was paid.
     * payPayable() creates a trace with description "Payment for: <original description>"
     * and dueDate = the actual payment date.
     */
    const findPaymentTraceDate = (originalDescription: string): Date | null => {
        const traceDescription = `Payment for: ${originalDescription}`;
        const trace = allTransactions.find(
            (t: any) =>
                t.type === 'Payable' &&
                t.status === 'Paid' &&
                !t.isHiddenFromHistory &&
                (t.description === traceDescription || t.description?.startsWith(`Payment for: ${originalDescription}`))
        );
        if (!trace) return null;
        if (trace.dueDate instanceof Timestamp) return trace.dueDate.toDate();
        return trace.dueDate ? new Date(trace.dueDate) : null;
    };

    /**
     * A payable obligation existed as-of the cutoff if:
     *   - The obligation was created (dueDate or linked purchase) on or before the cutoff, AND
     *   - It was either still Pending, OR it was paid AFTER the cutoff date.
     *
     * This ensures historical balance sheets correctly show payables that were later settled.
     */
    const isPayableOutstandingAsOf = (t: any): boolean => {
        if (!asOfDate) return true;

        // Check whether the obligation existed by the cutoff date
        const obligationExistedByThen = (() => {
            if (isBeforeOrOnCutoff(t.dueDate)) return true;
            const pid = parsePayablePurchaseId(t.description);
            if (!pid) return false;
            const purchase = allPurchases.find((p: any) => p.purchaseId === pid);
            return Boolean(purchase && isBeforeOrOnCutoff(purchase.date));
        })();

        if (!obligationExistedByThen) return false;

        // If still pending, it's definitely outstanding
        if (t.status === 'Pending') return true;

        // If paid, only count it as outstanding as-of the cutoff if payment happened AFTER the cutoff
        if (t.status === 'Paid') {
            const paymentDate = findPaymentTraceDate(t.description);
            if (!paymentDate) {
                // No trace found — fall back to: if it was paid and we can't tell when,
                // assume it was paid after the cutoff (conservative: avoids understating liabilities)
                return true;
            }
            // Payment date is after the cutoff → obligation was still outstanding as-of cutoff
            return paymentDate.getTime() > (asOfDate instanceof Date ? asOfDate : new Date(asOfDate)).getTime();
        }

        return false;
    };

    const { cash, bank, otherAssets } = calculateCashAndBank(
        filteredCapital,
        filteredDonations,
        filteredSales,
        paidTransactionsUpToCutoff,
        filteredExpenses,
        filteredTransfers
    );

    const { stockValue, officeAssetsValue } = calculateStockAndAssets(
        allItems,
        allSales,
        allPurchases,
        filteredPurchases,
        isBeforeOrOnCutoff
    );

    const receivables = calculateReceivables(
        allCustomers,
        filteredSales,
        paidTransactionsUpToCutoff,
        filteredReturns
    );

    // Include payables that were outstanding as-of the cutoff date.
    // This covers: currently-Pending payables, AND payables that were Paid AFTER the cutoff
    // (i.e. they were a real liability on that historical date even though settled later).
    // Exclude trace transactions (isHiddenFromHistory=false, description starts with "Payment for:")
    // and exclude the payment traces themselves (they are the settlement records, not obligations).
    const pendingPayables = allTransactions.filter((t: any) => {
        if (t.type !== 'Payable') return false;
        // Skip payment trace records — these are settlement logs, not obligations
        if (t.description?.startsWith('Payment for:')) return false;
        return isPayableOutstandingAsOf(t);
    });
    const payables = pendingPayables.reduce((sum: number, t: any) => sum + toNum(t.amount), 0);

    const totalAssets = cash + bank + receivables + stockValue + officeAssetsValue;
    const equity = totalAssets - payables;

    const totalCapital = filteredCapital.reduce((sum, cap) => sum + toNum(cap.amount), 0);
    const retainedEarnings = equity - totalCapital;

    const initialCashCapital = filteredCapital
        .filter((cap: any) => cap.source === 'Initial Capital' && cap.paymentMethod === 'Cash')
        .reduce((sum: number, cap: any) => sum + toNum(cap.amount), 0);

    const initialBankCapital = filteredCapital
        .filter((cap: any) => cap.source === 'Initial Capital' && cap.paymentMethod === 'Bank')
        .reduce((sum: number, cap: any) => sum + toNum(cap.amount), 0);

    const totalExpenses = filteredExpenses.reduce((sum: number, expense: any) => sum + toNum(expense.amount), 0);
    const totalStockCount = allItems.reduce((sum: number, item: any) => sum + toNum(item.stock), 0);

    return {
        cash,
        bank,
        stockValue,
        officeAssetsValue,
        receivables,
        totalAssets,
        payables,
        equity,
        otherAssets,
        totalCapital,
        retainedEarnings,
        initialCashCapital,
        initialBankCapital,
        totalExpenses,
        totalStockCount,
    };
}

