
import type { Donation, Expense, Item, Sale, Transaction } from './types';
import { isOperatingExpense } from './db/utils';

export interface ReportAnalysis {
  monthlyActivity: {
    totalSales: number;
    profitFromPaidSales: number;
    profitFromDuePayments: number;
    receivedPaymentsFromDues: number;
    totalProfit: number;
    totalExpenses: number;
    totalDonations: number;
  };
  salesBreakdown: {
    paid: number;
    due: number;
  };
  cashFlow: {
    sales: { cash: number; bank: number };
    duePayments: { cash: number; bank: number };
    donations: { cash: number; bank: number };
    expenses: { cash: number; bank: number };
  };
  netResult: {
    netProfitOrLoss: number;
  };
}

export interface ReportInput {
  salesData: Sale[];
  expensesData: Expense[];
  donationsData: Donation[];
  itemsData: Item[];
  month: string;
  year: string;
  transactionsData: Transaction[];
}

interface ReportStatsInput {
  salesData: Sale[];
  expensesData: Expense[];
  donationsData: Donation[];
  itemsData: Item[];
  transactionsData: Transaction[];
}

export function calculateReportStats(input: ReportStatsInput) {
  const { salesData, expensesData, donationsData, itemsData, transactionsData } = input;

  const calculateSaleProfit = (sale: Sale): number => {
    const totalProductionCost = sale.items.reduce((acc, saleItem) => {
        const itemData = itemsData.find(i => i.id === saleItem.itemId);
        if (itemData) {
            return acc + (itemData.productionPrice * saleItem.quantity);
        }
        return acc;
    }, 0);
    return sale.total - totalProductionCost;
  };

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

  const receivedPaymentsFromDues = duePayments
    .reduce((total, payment) => total + payment.amount, 0);

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

  const totalDonations = donationsData.reduce((sum, donation) => sum + donation.amount, 0);
  const donationsCashBank = donationsData.reduce(
    (acc, donation) => {
      if (donation.paymentMethod === 'Cash') {
        acc.cash += donation.amount;
      } else if (donation.paymentMethod === 'Bank') {
        acc.bank += donation.amount;
      }
      return acc;
    },
    { cash: 0, bank: 0 }
  );

  const totalProfit = profitFromPaidSales + profitFromDuePayments;

  const cashFlow = {
    sales: salesCashBank,
    duePayments: duePaymentsCashBank,
    donations: donationsCashBank,
    expenses: expensesCashBank,
  };

  const netProfitOrLoss = totalProfit + totalDonations - totalExpenses;

  return {
    totalSales,
    profitFromPaidSales,
    profitFromDuePayments,
    receivedPaymentsFromDues,
    totalProfit,
    totalExpenses,
    totalDonations,
    salesBreakdown,
    cashFlow,
    netProfitOrLoss,
  };
}

export interface DailyReportAnalysis {
  dailyActivity: {
    totalSales: number;
    profitFromPaidSales: number;
    profitFromDuePayments: number;
    receivedPaymentsFromDues: number;
    totalProfit: number;
    totalExpenses: number;
    totalDonations: number;
  };
  salesBreakdown: {
    paid: number;
    due: number;
  };
  cashFlow: {
    sales: { cash: number; bank: number };
    duePayments: { cash: number; bank: number };
    donations: { cash: number; bank: number };
    expenses: { cash: number; bank: number };
  };
  netResult: {
    netProfitOrLoss: number;
  };
}

export interface DailyReportInput {
  salesData: Sale[];
  expensesData: Expense[];
  donationsData: Donation[];
  itemsData: Item[];
  date: string;
  transactionsData: Transaction[];
}

export function generateDailyReport(input: DailyReportInput): DailyReportAnalysis {
  const stats = calculateReportStats(input);
  return {
    dailyActivity: {
      totalSales: stats.totalSales,
      profitFromPaidSales: stats.profitFromPaidSales,
      profitFromDuePayments: stats.profitFromDuePayments,
      receivedPaymentsFromDues: stats.receivedPaymentsFromDues,
      totalProfit: stats.totalProfit,
      totalExpenses: stats.totalExpenses,
      totalDonations: stats.totalDonations,
    },
    salesBreakdown: stats.salesBreakdown,
    cashFlow: stats.cashFlow,
    netResult: {
      netProfitOrLoss: stats.netProfitOrLoss,
    },
  };
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const stats = calculateReportStats(input);
  return {
    monthlyActivity: {
      totalSales: stats.totalSales,
      profitFromPaidSales: stats.profitFromPaidSales,
      profitFromDuePayments: stats.profitFromDuePayments,
      receivedPaymentsFromDues: stats.receivedPaymentsFromDues,
      totalProfit: stats.totalProfit,
      totalExpenses: stats.totalExpenses,
      totalDonations: stats.totalDonations,
    },
    salesBreakdown: stats.salesBreakdown,
    cashFlow: stats.cashFlow,
    netResult: {
      netProfitOrLoss: stats.netProfitOrLoss,
    },
  };
}
