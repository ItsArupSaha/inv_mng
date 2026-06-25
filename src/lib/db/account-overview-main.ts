'use server';

import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomers } from './customers';
import { getExpenses } from './expenses';
import { getItems } from './items';
import { getPurchases } from './purchases';
import { getSales } from './sales';
import { getSalesReturns } from './sales-returns';

/** Firestore / legacy data may store quantities as strings; `+` would concatenate instead of add. */
function toNum(v: unknown, fallback = 0): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

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

    let cash = 0;
    let bank = 0;
    let otherAssets = 0;

    filteredCapital.forEach((capital: any) => {
        const amt = toNum(capital.amount);
        if (capital.paymentMethod === 'Cash') {
            cash += amt;
        } else if (capital.paymentMethod === 'Bank') {
            bank += amt;
        } else if (capital.paymentMethod === 'Asset') {
            otherAssets += amt;
        }
    });

    filteredDonations.forEach((donation: any) => {
        if (donation.source !== 'Initial Capital' && donation.donorName !== 'Internal Transfer') {
            const amt = toNum(donation.amount);
            if (donation.paymentMethod === 'Cash') {
                cash += amt;
            } else if (donation.paymentMethod === 'Bank') {
                bank += amt;
            }
        }
    });

    filteredSales.forEach((sale: any) => {
        const total = toNum(sale.total);
        const amountPaid = toNum(sale.amountPaid);
        if (sale.paymentMethod === 'Cash') {
            cash += total;
        } else if (sale.paymentMethod === 'Bank') {
            bank += total;
        } else if (sale.paymentMethod === 'Split' && amountPaid > 0) {
            if (sale.splitPaymentMethod === 'Bank') {
                bank += amountPaid;
            } else {
                cash += amountPaid;
            }
        }
    });

    paidTransactionsUpToCutoff.forEach((t: any) => {
        if (t.type === 'Receivable') {
            const description = t.description || '';
            if (description.startsWith('Payment from customer')) {
                const amt = toNum(t.amount);
                if (t.paymentMethod === 'Cash') {
                    cash += amt;
                } else if (t.paymentMethod === 'Bank') {
                    bank += amt;
                }
            }
        }
    });

    filteredExpenses.forEach((expense: any) => {
        const amt = toNum(expense.amount);
        if (expense.paymentMethod === 'Bank') {
            bank -= amt;
        } else {
            cash -= amt;
        }
    });

    filteredTransfers.forEach((transfer: any) => {
        const amt = toNum(transfer.amount);
        if (transfer.from === 'Cash') {
            cash -= amt;
        } else if (transfer.from === 'Bank') {
            bank -= amt;
        }

        if (transfer.to === 'Cash') {
            cash += amt;
        } else if (transfer.to === 'Bank') {
            bank += amt;
        }
    });

    const stockValue = allItems.reduce((sum: number, item: any) => {
        const itemSalesAfterCutoff = allSales
            .filter((sale: any) => !isBeforeOrOnCutoff(sale.date))
            .reduce((saleSum: number, sale: any) => {
                const saleItems = Array.isArray(sale.items) ? sale.items : [];
                const saleItem = saleItems.find((si: any) => si.itemId === item.id);
                if (saleItem) {
                    return saleSum + toNum(saleItem.quantity);
                }
                return saleSum;
            }, 0);

        const itemPurchasesAfterCutoff = allPurchases
            .filter((purchase: any) => !isBeforeOrOnCutoff(purchase.date))
            .reduce((purchaseSum: number, purchase: any) => {
                const purchaseItems = Array.isArray(purchase.items) ? purchase.items : [];
                const purchaseItem = purchaseItems.find(
                    (pi: any) => pi.categoryId === item.categoryId && pi.itemName === item.title
                );
                if (purchaseItem) {
                    return purchaseSum + toNum(purchaseItem.quantity);
                }
                return purchaseSum;
            }, 0);

        const closingStockAsOfDate =
            toNum(item.stock) + itemSalesAfterCutoff - itemPurchasesAfterCutoff;
        const unitCost = toNum(item.productionPrice);
        const value = closingStockAsOfDate > 0 ? unitCost * closingStockAsOfDate : 0;
        return sum + value;
    }, 0);

    const officeAssetsValue = filteredPurchases
        .flatMap((p: any) => p.items)
        .filter((i: any) => i.categoryName === 'Office Asset')
        .reduce((sum: number, item: any) => sum + toNum(item.cost) * toNum(item.quantity), 0);

    // Calculate historical receivables
    // Start with all customers' opening balances
    let receivables = allCustomers.reduce(
        (sum: number, customer: any) => sum + toNum(customer.openingBalance),
        0
    );

    // Add Sales Dues and Credit Usage
    filteredSales.forEach((sale: any) => {
        // Applying credit increases the balance (consuming negative balance)
        receivables += toNum(sale.creditApplied);

        const total = toNum(sale.total);
        const amountPaid = toNum(sale.amountPaid);
        if (sale.paymentMethod === 'Due') {
            receivables += total;
        } else if (sale.paymentMethod === 'Split') {
            const due = total - amountPaid;
            receivables += due;
        }
    });

    // Subtract Payments
    paidTransactionsUpToCutoff.forEach((t: any) => {
        if (t.type === 'Receivable') {
            const description = t.description || '';
            if (description.startsWith('Payment from customer')) {
                receivables -= toNum(t.amount);
            }
        }
    });

    // Subtract Sales Returns
    filteredReturns.forEach((ret: any) => {
        receivables -= toNum(ret.totalReturnValue);
    });

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
    };
}
