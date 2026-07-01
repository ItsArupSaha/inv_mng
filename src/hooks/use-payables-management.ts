'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomersWithNegativeBalance,
  getPaidPayables,
  getTransactionsPaginated,
} from '@/lib/actions';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import { usePayablesExport } from './use-payables-export';

export function usePayablesManagement(userId: string) {
  const { authUser } = useAuth();
  const { toast } = useToast();

  // States for pending payables
  const [payables, setPayables] = React.useState<Transaction[]>([]);
  const [hasMorePayables, setHasMorePayables] = React.useState(true);
  const [isInitialLoadingPayables, setIsInitialLoadingPayables] = React.useState(true);
  const [isLoadingMorePayables, setIsLoadingMorePayables] = React.useState(false);

  // States for customer overpayments
  const [overpaidCustomers, setOverpaidCustomers] = React.useState<CustomerWithDue[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(true);

  // States for paid payables (history)
  const [paidPayables, setPaidPayables] = React.useState<Transaction[]>([]);
  const [isLoadingPaid, setIsLoadingPaid] = React.useState(true);

  // Reporting states
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [asOfDate, setAsOfDate] = React.useState<Date | undefined>();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportType, setReportType] = React.useState<'pending' | 'paid'>('pending');

  const loadPendingPayables = React.useCallback(async () => {
    setIsInitialLoadingPayables(true);
    try {
      const { transactions, hasMore } = await getTransactionsPaginated({
        userId,
        type: 'Payable',
        pageLimit: 10,
      });
      setPayables(transactions);
      setHasMorePayables(hasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load payables.' });
    } finally {
      setIsInitialLoadingPayables(false);
    }
  }, [userId, toast]);

  const loadOverpaidCustomers = React.useCallback(async () => {
    setIsLoadingCustomers(true);
    try {
      const customers = await getCustomersWithNegativeBalance(userId);
      setOverpaidCustomers(customers);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load customer overpayments.' });
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [userId, toast]);

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

  const loadAllData = React.useCallback(() => {
    loadPendingPayables();
    loadOverpaidCustomers();
    loadPaidPayables();
  }, [loadPendingPayables, loadOverpaidCustomers, loadPaidPayables]);

  React.useEffect(() => {
    if (userId) {
      loadAllData();
    }
  }, [userId, loadAllData]);

  const handleLoadMorePayables = async () => {
    if (!hasMorePayables || isLoadingMorePayables) return;
    setIsLoadingMorePayables(true);
    try {
      const lastTransactionId = payables[payables.length - 1]?.id;
      const { transactions, hasMore } = await getTransactionsPaginated({
        userId,
        type: 'Payable',
        pageLimit: 10,
        lastVisibleId: lastTransactionId,
      });
      setPayables((prev) => [...prev, ...transactions]);
      setHasMorePayables(hasMore);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load more payables.' });
    } finally {
      setIsLoadingMorePayables(false);
    }
  };

  // Call the exports sub-hook
  const payablesExport = usePayablesExport({
    userId,
    authUser,
    asOfDate,
    dateRange,
    reportType,
    setIsDownloadDialogOpen,
  });

  return {
    authUser,
    payables,
    hasMorePayables,
    isInitialLoadingPayables,
    isLoadingMorePayables,
    overpaidCustomers,
    isLoadingCustomers,
    paidPayables,
    isLoadingPaid,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    asOfDate,
    setAsOfDate,
    dateRange,
    setDateRange,
    reportType,
    setReportType,
    loadAllData,
    handleLoadMorePayables,
    handleDownload: payablesExport.handleDownload,
  };
}
