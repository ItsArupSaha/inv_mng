import type { Sale, Transaction } from '@/lib/types';

export type SaleStatus = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  dueAmount?: number;
};

export function getOriginalDueAmount(sale: Sale) {
  if (sale.paymentMethod === 'Due') {
    return sale.total;
  }
  if (sale.paymentMethod === 'Split') {
    return Math.max(0, sale.total - (sale.amountPaid || 0));
  }
  return 0;
}

export function getImmediateSaleStatus(sale: Sale): SaleStatus {
  switch (sale.paymentMethod) {
    case 'Cash':
      return { label: 'Cash', variant: 'default' };
    case 'Bank':
      return { label: 'Bank', variant: 'default' };
    case 'Paid by Credit':
      return { label: 'Credit', variant: 'default' };
    case 'Due':
      return { label: 'Due', variant: 'destructive', dueAmount: sale.total };
    case 'Split':
      return {
        label: 'Partial Due',
        variant: 'secondary',
        dueAmount: Math.max(0, sale.total - (sale.amountPaid || 0)),
      };
    default:
      return { label: sale.paymentMethod, variant: 'outline' };
  }
}

export function getResolvedSaleStatus(sale: Sale, transaction: Transaction | null): SaleStatus {
  if (sale.paymentMethod !== 'Due' && sale.paymentMethod !== 'Split') {
    return getImmediateSaleStatus(sale);
  }

  const originalDueAmount = getOriginalDueAmount(sale);

  if (!transaction) {
    return getImmediateSaleStatus(sale);
  }

  if (transaction.status === 'Paid' || transaction.amount <= 0) {
    return { label: 'Paid', variant: 'default' };
  }

  if (sale.paymentMethod === 'Split' || transaction.amount < originalDueAmount) {
    return {
      label: 'Partial Due',
      variant: 'secondary',
      dueAmount: transaction.amount,
    };
  }

  return {
    label: 'Due',
    variant: 'destructive',
    dueAmount: transaction.amount,
  };
}
