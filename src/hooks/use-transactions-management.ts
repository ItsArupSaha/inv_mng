import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  addTransaction,
  getTransactions,
  getTransactionsPaginated,
  getPaidPayables,
  getPaidPayablesForDateRange,
  updateTransactionStatus,
} from '@/lib/actions';
import { getPayablesAsOfDate } from '@/lib/db/account-overview';
import type { Transaction } from '@/lib/types';
import { transactionSchema, type TransactionFormValues } from '@/components/transactions/schema';
import {
  generatePendingPayablesPdf,
  generatePendingPayablesXlsx,
  generatePaidPayablesPdf,
  generatePaidPayablesXlsx,
} from '@/components/transactions/transactions-export-utils';

interface UseTransactionsManagementProps {
  userId: string;
  type: 'Payable';
}

export function useTransactionsManagement({ userId, type }: UseTransactionsManagementProps) {
  const { authUser } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [paidPayables, setPaidPayables] = React.useState<Transaction[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingPaid, setIsLoadingPaid] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [asOfDate, setAsOfDate] = React.useState<Date | undefined>();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportType, setReportType] = React.useState<'pending' | 'paid'>('pending');
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    const { transactions: newTransactions, hasMore: newHasMore } = await getTransactionsPaginated({
      userId,
      type,
      pageLimit: 5,
    });
    setTransactions(newTransactions);
    setHasMore(newHasMore);
    setIsInitialLoading(false);
  }, [userId, type]);

  const loadPaidPayables = React.useCallback(async () => {
    setIsLoadingPaid(true);
    try {
      const paid = await getPaidPayables(userId);
      setPaidPayables(paid);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load paid payables.' });
    } finally {
      setIsLoadingPaid(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
      loadPaidPayables();
    }
  }, [userId, loadInitialData, loadPaidPayables]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastTransactionId = transactions[transactions.length - 1]?.id;
    const { transactions: newTransactions, hasMore: newHasMore } = await getTransactionsPaginated({
      userId,
      type,
      pageLimit: 5,
      lastVisibleId: lastTransactionId,
    });
    setTransactions((prev) => [...prev, ...newTransactions]);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
    },
  });

  const handleAddNew = () => {
    form.reset({ description: '', amount: 0, dueDate: new Date() });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TransactionFormValues) => {
    startTransition(async () => {
      const newTransaction = await addTransaction(userId, { ...data, type });
      setTransactions((prev) => [newTransaction, ...prev]);
      toast({ title: `${type} Added`, description: `The new ${type.toLowerCase()} has been recorded.` });
      setIsDialogOpen(false);
    });
  };

  const handleMarkAsPaid = async (transactionId: string) => {
    startTransition(async () => {
      await updateTransactionStatus(userId, transactionId, 'Paid', type);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      loadPaidPayables();
      toast({ title: 'Payable Paid', description: 'The payable has been marked as paid.' });
    });
  };

  const handlePendingPayablesReport = async (formatType: 'pdf' | 'xlsx') => {
    let data;
    const targetDate = asOfDate || new Date();

    if (asOfDate) {
      data = await getPayablesAsOfDate(userId, targetDate);
    } else {
      data = await getTransactions(userId, type);
    }

    if (data.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'There are no pending payables to download.' });
      return;
    }

    if (formatType === 'pdf') {
      generatePendingPayablesPdf(data, targetDate, authUser!);
    } else {
      generatePendingPayablesXlsx(data, targetDate);
    }
  };

  const handlePaidPayablesReport = async (formatType: 'pdf' | 'xlsx') => {
    if (!dateRange?.from) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date range for the report.' });
      return;
    }

    const paid = await getPaidPayablesForDateRange(userId, dateRange.from, dateRange.to);

    if (paid.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No paid payables found in this date range.' });
      return;
    }

    if (formatType === 'pdf') {
      generatePaidPayablesPdf(paid, dateRange.from, dateRange.to, authUser || undefined);
    } else {
      generatePaidPayablesXlsx(paid, dateRange.from, dateRange.to);
    }
  };

  const handleDownload = async (formatType: 'pdf' | 'xlsx') => {
    if (!authUser) return;

    if (reportType === 'pending') {
      await handlePendingPayablesReport(formatType);
    } else {
      await handlePaidPayablesReport(formatType);
    }
    setIsDownloadDialogOpen(false);
  };

  return {
    authUser,
    transactions,
    paidPayables,
    hasMore,
    isInitialLoading,
    isLoadingPaid,
    isLoadingMore,
    isDialogOpen,
    setIsDialogOpen,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    asOfDate,
    setAsOfDate,
    dateRange,
    setDateRange,
    reportType,
    setReportType,
    handleLoadMore,
    form,
    handleAddNew,
    onSubmit,
    handleMarkAsPaid,
    handleDownload,
    isPending
  };
}
