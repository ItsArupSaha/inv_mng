import { Timestamp } from 'firebase/firestore';
import type { Sale, Item, Purchase, Customer } from '../types';

export function toNum(v: unknown, fallback = 0): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export function calculateCashAndBank(
  filteredCapital: any[],
  filteredDonations: any[],
  filteredSales: any[],
  paidTransactionsUpToCutoff: any[],
  filteredExpenses: any[],
  filteredTransfers: any[]
) {
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

    return { cash, bank, otherAssets };
}

export function calculateStockAndAssets(
  allItems: Item[],
  allSales: Sale[],
  allPurchases: Purchase[],
  filteredPurchases: Purchase[],
  isBeforeOrOnCutoff: (date: any) => boolean
) {
    let stockValue = 0;
    let assetItemsValue = 0;

    allItems.forEach((item: any) => {
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
        
        const catName = (item.categoryName || '').toLowerCase();
        if (catName === 'assets' || catName === 'surgicals') {
            assetItemsValue += value;
        } else {
            stockValue += value;
        }
    });

    const officeAssetsValue = filteredPurchases
        .flatMap((p: any) => p.items)
        .filter((i: any) => i.categoryName === 'Office Asset')
        .reduce((sum: number, item: any) => sum + toNum(item.cost) * toNum(item.quantity), 0) + assetItemsValue;

    return { stockValue, officeAssetsValue };
}

export function calculateReceivables(
  allCustomers: Customer[],
  filteredSales: Sale[],
  paidTransactionsUpToCutoff: any[],
  filteredReturns: any[]
) {
    let receivables = allCustomers.reduce(
        (sum: number, customer: any) => sum + toNum(customer.openingBalance),
        0
    );

    filteredSales.forEach((sale: any) => {
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

    paidTransactionsUpToCutoff.forEach((t: any) => {
        if (t.type === 'Receivable') {
            const description = t.description || '';
            if (description.startsWith('Payment from customer')) {
                receivables -= toNum(t.amount);
            }
        }
    });

    filteredReturns.forEach((ret: any) => {
        receivables -= toNum(ret.totalReturnValue);
    });

    return receivables;
}
