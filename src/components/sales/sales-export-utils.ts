import { format } from 'date-fns';
import type { Sale, Item, Customer, Transaction } from '@/lib/types';
import { getSales, getTransactionsForCustomer } from '@/lib/actions';
import type { DateRange } from 'react-day-picker';

export * from './sales-export-pdf';
export * from './sales-export-xlsx';

function getOriginalDueAmount(sale: Sale) {
  if (sale.paymentMethod === 'Due') {
    return sale.total;
  }
  if (sale.paymentMethod === 'Split') {
    return Math.max(0, sale.total - (sale.amountPaid || 0));
  }
  return 0;
}

export async function getFilteredSales(userId: string, dateRange: DateRange | undefined) {
  if (!dateRange?.from) {
    throw new Error("Please select a start date.");
  }

  const allSales = await getSales(userId);
  const from = dateRange.from;
  const to = dateRange.to || dateRange.from;
  
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  return allSales.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate >= start && saleDate <= end;
  });
}

export async function resolveExportBreakdownForSales(userId: string, salesToResolve: Sale[], reportEndDate: Date) {
  const breakdownBySaleId: Record<
    string,
    {
      statusLabel: string;
      paidAmount: number;
      dueAmount: number;
    }
  > = {};

  const allSales = await getSales(userId);
  const customerIds = Array.from(new Set(salesToResolve.map((sale) => sale.customerId)));

  const customerTransactionsMap = new Map(
    await Promise.all(
      customerIds.map(async (customerId) => {
        const transactions = await getTransactionsForCustomer(userId, customerId, 'Receivable');
        return [customerId, transactions] as const;
      })
    )
  );

  const formatMoney = (amount: number) => amount.toFixed(2);

  const buildSplitLabel = (cashAmount: number, bankAmount: number, dueAmount: number) => {
    const parts: string[] = [];
    if (cashAmount > 0) {
      parts.push(`${formatMoney(cashAmount)} Cash`);
    }
    if (bankAmount > 0) {
      parts.push(`${formatMoney(bankAmount)} Bank`);
    }
    if (dueAmount > 0) {
      parts.push(`${formatMoney(dueAmount)} Due`);
    }
    return `Split\n${parts.join('\n')}`;
  };

  for (const customerId of customerIds) {
    const customerSales = allSales
      .filter((sale) => sale.customerId === customerId && new Date(sale.date) <= reportEndDate)
      .filter((sale) => sale.paymentMethod === 'Due' || sale.paymentMethod === 'Split')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const ledger = customerSales.map((sale) => ({
      saleId: sale.id,
      originalDueAmount: getOriginalDueAmount(sale),
      remainingDueAmount: getOriginalDueAmount(sale),
      cashPaidAmount: sale.paymentMethod === 'Split' && sale.splitPaymentMethod === 'Cash' ? sale.amountPaid || 0 : 0,
      bankPaidAmount: sale.paymentMethod === 'Split' && sale.splitPaymentMethod === 'Bank' ? sale.amountPaid || 0 : 0,
    }));

    const customerPayments = (customerTransactionsMap.get(customerId) || [])
      .filter((transaction) => transaction.status === 'Paid')
      .filter((transaction) => transaction.description?.startsWith('Payment from customer'))
      .filter((transaction) => new Date(transaction.dueDate) <= reportEndDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    for (const payment of customerPayments) {
      let amountToAllocate = payment.amount;

      for (const saleLedger of ledger) {
        if (amountToAllocate <= 0) break;
        if (saleLedger.remainingDueAmount <= 0) continue;

        const allocatedAmount = Math.min(amountToAllocate, saleLedger.remainingDueAmount);
        saleLedger.remainingDueAmount -= allocatedAmount;

        if (payment.paymentMethod === 'Bank') {
          saleLedger.bankPaidAmount += allocatedAmount;
        } else {
          saleLedger.cashPaidAmount += allocatedAmount;
        }

        amountToAllocate -= allocatedAmount;
      }
    }

    for (const sale of salesToResolve.filter((entry) => entry.customerId === customerId)) {
      const total = sale.total;

      if (sale.paymentMethod === 'Cash') {
        breakdownBySaleId[sale.id] = { statusLabel: 'Cash', paidAmount: total, dueAmount: 0 };
        continue;
      }

      if (sale.paymentMethod === 'Bank') {
        breakdownBySaleId[sale.id] = { statusLabel: 'Bank', paidAmount: total, dueAmount: 0 };
        continue;
      }

      if (sale.paymentMethod === 'Paid by Credit') {
        breakdownBySaleId[sale.id] = { statusLabel: 'Credit', paidAmount: total, dueAmount: 0 };
        continue;
      }

      const saleLedger = ledger.find((entry) => entry.saleId === sale.id);

      if (!saleLedger) {
        breakdownBySaleId[sale.id] = {
          statusLabel: sale.paymentMethod === 'Split'
            ? buildSplitLabel(
                sale.splitPaymentMethod === 'Cash' ? sale.amountPaid || 0 : 0,
                sale.splitPaymentMethod === 'Bank' ? sale.amountPaid || 0 : 0,
                getOriginalDueAmount(sale)
              )
            : 'Due',
          paidAmount: sale.paymentMethod === 'Split' ? sale.amountPaid || 0 : 0,
          dueAmount: getOriginalDueAmount(sale),
        };
        continue;
      }

      const paidAmount = saleLedger.cashPaidAmount + saleLedger.bankPaidAmount;
      const dueAmount = saleLedger.remainingDueAmount;

      let statusLabel = 'Due';
      if (dueAmount <= 0) {
        if (saleLedger.cashPaidAmount > 0 && saleLedger.bankPaidAmount === 0) {
          statusLabel = 'Cash';
        } else if (saleLedger.bankPaidAmount > 0 && saleLedger.cashPaidAmount === 0) {
          statusLabel = 'Bank';
        } else {
          statusLabel = buildSplitLabel(saleLedger.cashPaidAmount, saleLedger.bankPaidAmount, 0);
        }
      } else if (sale.paymentMethod === 'Split') {
        statusLabel = buildSplitLabel(saleLedger.cashPaidAmount, saleLedger.bankPaidAmount, dueAmount);
      }

      breakdownBySaleId[sale.id] = {
        statusLabel,
        paidAmount,
        dueAmount,
      };
    }
  }

  return breakdownBySaleId;
}
