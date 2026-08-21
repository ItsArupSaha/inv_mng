import type { Expense, Item, Purchase, Sale, SaleItem, Transaction } from './types';
import { isOperatingExpense, isSupplierPaymentExpense } from './db/utils';

export interface PurchaseActivitySummary {
  totalPurchased: number; // invoice final amounts bought in the period
  paidToSuppliers: number; // net money out to suppliers (payments minus refunds)
  newSupplierDue: number; // due added by new purchases (Due/Split remainders)
}

export interface TopSellerRow {
  itemTitle: string;
  quantity: number;
  revenue: number;
  profit: number;
}

interface ActivityStats {
  totalSales: number;
  totalExtraSales?: number;
  profitFromPaidSales: number;
  profitFromDuePayments: number;
  receivedPaymentsFromDues: number;
  totalProfit: number;
  totalExpenses: number;
}

interface CoreStats {
  totalSales: number;
  totalExtraSales: number;
  profitFromPaidSales: number;
  profitFromDuePayments: number;
  receivedPaymentsFromDues: number;
  totalProfit: number;
  totalExpenses: number;
  salesBreakdown: { paid: number; due: number };
  cashFlow: {
    sales: { cash: number; bank: number };
    duePayments: { cash: number; bank: number };
    expenses: { cash: number; bank: number };
  };
  netProfitOrLoss: number;
  purchases: PurchaseActivitySummary;
  topSellers: TopSellerRow[];
}

export interface ReportInput {
  salesData: Sale[];
  expensesData: Expense[];
  itemsData: Item[];
  purchasesData: Purchase[];
  month: string;
  year: string;
  transactionsData: Transaction[];
}

interface ReportStatsInput {
  salesData: Sale[];
  expensesData: Expense[];
  itemsData: Item[];
  purchasesData: Purchase[];
  transactionsData: Transaction[];
}

function purchaseFinalAmount(purchase: Purchase): number {
  return (
    (Number(purchase.totalAmount) || 0) +
    (Number(purchase.vatAmount) || 0) -
    (Number(purchase.discountAmount) || 0)
  );
}

/**
 * Cost of a sold line. Sales recorded since batch tracking freeze the real
 * per-unit cost at sale time; older sales fall back to the item's current
 * cost, which is the best available estimate for them.
 */
function saleLineCost(saleItem: SaleItem, itemsData: Item[]): number {
  if (saleItem.batches?.length) {
    return saleItem.batches.reduce(
      (sum, alloc) => sum + alloc.quantity * (Number(alloc.costAtSale) || 0),
      0
    );
  }
  const item = itemsData.find(i => i.id === saleItem.itemId);
  const unitCost = item ? Number(item.productionPrice) || 0 : 0;
  return unitCost * saleItem.quantity;
}

function buildPurchaseSummary(purchases: Purchase[], expenses: Expense[]): PurchaseActivitySummary {
  const totalPurchased = purchases.reduce((sum, p) => sum + purchaseFinalAmount(p), 0);

  const paidToSuppliers = expenses.reduce((sum, expense) => {
    if (!isSupplierPaymentExpense(expense.description)) return sum;
    return sum + (Number(expense.amount) || 0); // supplier refunds are negative
  }, 0);

  const newSupplierDue = purchases.reduce((sum, p) => {
    const finalAmount = purchaseFinalAmount(p);
    if (p.paymentMethod === 'Due') return sum + finalAmount;
    if (p.paymentMethod === 'Split') return sum + Math.max(0, finalAmount - (Number(p.amountPaid) || 0));
    return sum;
  }, 0);

  return { totalPurchased, paidToSuppliers, newSupplierDue };
}

function buildTopSellers(sales: Sale[], itemsData: Item[], limit = 10): TopSellerRow[] {
  const byItem = new Map<string, TopSellerRow>();
  for (const sale of sales) {
    for (const saleItem of sale.items) {
      const row = byItem.get(saleItem.itemId) || {
        itemTitle: itemsData.find(i => i.id === saleItem.itemId)?.title || 'Unknown item',
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      const cost = saleLineCost(saleItem, itemsData);
      row.quantity += Number(saleItem.quantity) || 0;
      row.revenue += (Number(saleItem.price) || 0) * (Number(saleItem.quantity) || 0);
      row.profit += (Number(saleItem.price) || 0) * (Number(saleItem.quantity) || 0) - cost;
      byItem.set(saleItem.itemId, row);
    }
  }
  return Array.from(byItem.values()).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

function calculateCoreStats(input: ReportStatsInput): CoreStats {
  const { salesData, expensesData, itemsData, purchasesData, transactionsData } = input;

  const calculateSaleProfit = (sale: Sale): number =>
    sale.total - sale.items.reduce((acc, saleItem) => acc + saleLineCost(saleItem, itemsData), 0);

  const profitFromPaidSales = salesData
    .filter(sale => sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Bank' || sale.paymentMethod === 'Split')
    .reduce((totalProfit, sale) => {
      const totalSaleProfit = calculateSaleProfit(sale);
      if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.total > 0) {
        const paymentRatio = sale.amountPaid / sale.total;
        return totalProfit + (totalSaleProfit * paymentRatio);
      }
      return totalProfit + totalSaleProfit;
    }, 0);

  const profitFromDuePayments = transactionsData
    .filter(t => t.type === 'Receivable' && t.status === 'Paid')
    .filter(t => {
      if (t.saleId && t.description?.startsWith('Partial payment')) {
        return false;
      }
      return true;
    })
    .reduce((sum, t) => sum + (t.recognizedProfit || 0), 0);

  const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
  const totalExtraSales = salesData.reduce((sum, sale) => sum + (sale.extraSales || 0), 0);

  const salesBreakdown = salesData.reduce(
    (acc, sale) => {
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Bank' || sale.paymentMethod === 'Paid by Credit') {
        acc.paid += sale.total;
      } else if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.total > 0) {
        acc.paid += sale.amountPaid;
        acc.due += sale.total - sale.amountPaid;
      } else if (sale.paymentMethod === 'Due') {
        acc.due += sale.total;
      }
      return acc;
    },
    { paid: 0, due: 0 }
  );

  const salesCashBank = salesData.reduce(
    (acc, sale) => {
      if (sale.paymentMethod === 'Cash') {
        acc.cash += sale.total;
      } else if (sale.paymentMethod === 'Bank') {
        acc.bank += sale.total;
      } else if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.amountPaid > 0 && sale.splitPaymentMethod) {
        if (sale.splitPaymentMethod === 'Cash') {
          acc.cash += sale.amountPaid;
        } else if (sale.splitPaymentMethod === 'Bank') {
          acc.bank += sale.amountPaid;
        }
      }
      return acc;
    },
    { cash: 0, bank: 0 }
  );

  const duePayments = transactionsData
    .filter(t => t.type === 'Receivable' && t.status === 'Paid' && t.description?.startsWith('Payment from customer'));

  const receivedPaymentsFromDues = duePayments.reduce((total, payment) => total + payment.amount, 0);

  const duePaymentsCashBank = duePayments.reduce(
    (acc, t) => {
      if (t.paymentMethod === 'Cash') {
        acc.cash += t.amount;
      } else if (t.paymentMethod === 'Bank') {
        acc.bank += t.amount;
      }
      return acc;
    },
    { cash: 0, bank: 0 }
  );

  const operatingExpenses = expensesData.filter(expense => isOperatingExpense(expense.description));
  const totalExpenses = operatingExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesCashBank = operatingExpenses.reduce(
    (acc, expense) => {
      if (expense.paymentMethod === 'Cash') {
        acc.cash += expense.amount;
      } else if (expense.paymentMethod === 'Bank') {
        acc.bank += expense.amount;
      }
      return acc;
    },
    { cash: 0, bank: 0 }
  );

  const totalProfit = profitFromPaidSales + profitFromDuePayments;

  return {
    totalSales,
    totalExtraSales,
    profitFromPaidSales,
    profitFromDuePayments,
    receivedPaymentsFromDues,
    totalProfit,
    totalExpenses,
    salesBreakdown,
    cashFlow: {
      sales: salesCashBank,
      duePayments: duePaymentsCashBank,
      expenses: expensesCashBank,
    },
    netProfitOrLoss: totalProfit - totalExpenses,
    purchases: buildPurchaseSummary(purchasesData, expensesData),
    topSellers: buildTopSellers(salesData, itemsData),
  };
}

export interface ReportAnalysis {
  monthlyActivity: ActivityStats;
  salesBreakdown: { paid: number; due: number };
  cashFlow: CoreStats['cashFlow'];
  purchases: PurchaseActivitySummary;
  topSellers: TopSellerRow[];
  netResult: { netProfitOrLoss: number };
}

export interface DailyReportInput {
  salesData: Sale[];
  expensesData: Expense[];
  itemsData: Item[];
  purchasesData: Purchase[];
  date: string;
  transactionsData: Transaction[];
}

export interface DailyReportAnalysis {
  dailyActivity: ActivityStats;
  salesBreakdown: { paid: number; due: number };
  cashFlow: CoreStats['cashFlow'];
  purchases: PurchaseActivitySummary;
  topSellers: TopSellerRow[];
  netResult: { netProfitOrLoss: number };
}

export function calculateReportStats(input: ReportStatsInput): CoreStats {
  return calculateCoreStats(input);
}

export function generateDailyReport(input: DailyReportInput): DailyReportAnalysis {
  const stats = calculateCoreStats(input);
  return {
    dailyActivity: {
      totalSales: stats.totalSales,
      totalExtraSales: stats.totalExtraSales,
      profitFromPaidSales: stats.profitFromPaidSales,
      profitFromDuePayments: stats.profitFromDuePayments,
      receivedPaymentsFromDues: stats.receivedPaymentsFromDues,
      totalProfit: stats.totalProfit,
      totalExpenses: stats.totalExpenses,
    },
    salesBreakdown: stats.salesBreakdown,
    cashFlow: stats.cashFlow,
    purchases: stats.purchases,
    topSellers: stats.topSellers,
    netResult: { netProfitOrLoss: stats.netProfitOrLoss },
  };
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const stats = calculateCoreStats(input);
  return {
    monthlyActivity: {
      totalSales: stats.totalSales,
      totalExtraSales: stats.totalExtraSales,
      profitFromPaidSales: stats.profitFromPaidSales,
      profitFromDuePayments: stats.profitFromDuePayments,
      receivedPaymentsFromDues: stats.receivedPaymentsFromDues,
      totalProfit: stats.totalProfit,
      totalExpenses: stats.totalExpenses,
    },
    salesBreakdown: stats.salesBreakdown,
    cashFlow: stats.cashFlow,
    purchases: stats.purchases,
    topSellers: stats.topSellers,
    netResult: { netProfitOrLoss: stats.netProfitOrLoss },
  };
}
