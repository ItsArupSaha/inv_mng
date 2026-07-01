'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  addTransaction,
  getTransactionsPaginated,
  getPaidPayables,
  updateTransactionStatus,
} from '@/lib/actions';
import type { Transaction } from '@/lib/types';
import { transactionSchema, type TransactionFormValues } from '@/components/transactions/schema';
import { useTransactionsReports } from './use-transactions-reports';

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

  // Call the reports download sub-hook
  const reports = useTransactionsReports({
    userId,
    type,
    authUser,
  });

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
    isPending,
    loadInitialData,
    handleLoadMore,
    form,
    handleAddNew,
    onSubmit,
    handleMarkAsPaid,

    // Delegate reports controls
    isDownloadDialogOpen: reports.isDownloadDialogOpen,
    setIsDownloadDialogOpen: reports.setIsDownloadDialogOpen,
    asOfDate: reports.asOfDate,
    setAsOfDate: reports.setAsOfDate,
    dateRange: reports.dateRange,
    setDateRange: reports.setDateRange,
    reportType: reports.reportType,
    setReportType: reports.setReportType,
    handleDownload: reports.handleDownload,
  };
}
