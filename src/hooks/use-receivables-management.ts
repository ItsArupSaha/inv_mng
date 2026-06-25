'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomersWithDueBalance,
  getCustomersWithDueBalancePaginated,
  getPaidReceivablesForDateRange,
} from '@/lib/actions';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import {
  generatePdf,
  generateXlsx,
  generateReceivedPaymentsPdf,
  generateReceivedPaymentsXlsx,
} from '@/components/receivables/receivables-export-utils';

interface UseReceivablesManagementProps {
  userId: string;
}

export function useReceivablesManagement({ userId }: UseReceivablesManagementProps) {
  const { authUser } = useAuth();
  const [customers, setCustomers] = React.useState<CustomerWithDue[]>([]);
  const [receivedPayments, setReceivedPayments] = React.useState<Transaction[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingReceived, setIsLoadingReceived] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportType, setReportType] = React.useState<'pending' | 'received'>('pending');
  const { toast } = useToast();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { customersWithDue, hasMore: hasMoreData } = await getCustomersWithDueBalancePaginated({
        userId,
        pageLimit: 10,
      });
      setCustomers(customersWithDue);
      setHasMore(hasMoreData);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load receivables.' });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  const loadReceivedPayments = React.useCallback(async () => {
    setIsLoadingReceived(true);
    try {
      const startDate = new Date(2000, 0, 1);
      const endDate = new Date();
      const received = await getPaidReceivablesForDateRange(userId, startDate, endDate);
      setReceivedPayments(received);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load received payments.' });
    } finally {
      setIsLoadingReceived(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
      loadReceivedPayments();
    }
  }, [userId, loadInitialData, loadReceivedPayments]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastCustomer = customers[customers.length - 1];

    const lastVisible = {
      id: lastCustomer.id,
      dueBalance: lastCustomer.dueBalance,
    };

    try {
      const { customersWithDue: newCustomers, hasMore: newHasMore } =
        await getCustomersWithDueBalancePaginated({ userId, pageLimit: 10, lastVisible });
      setCustomers((prev) => [...prev, ...newCustomers]);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load more receivables.' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePendingDuesReport = async (formatType: 'pdf' | 'xlsx') => {
    let data;
    const targetDate = dateRange?.from || new Date();

    if (dateRange?.from) {
      const { getCustomersWithDueBalanceAsOfDate } = await import('@/lib/db/account-overview');
      data = await getCustomersWithDueBalanceAsOfDate(userId, targetDate);
    } else {
      data = await getCustomersWithDueBalance(userId);
    }

    if (data.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'There are no pending receivables to download.' });
      return;
    }

    if (formatType === 'pdf') {
      generatePdf(data, targetDate, authUser!);
    } else {
      generateXlsx(data, targetDate);
    }
  };

  const handleReceivedPaymentsReport = async (formatType: 'pdf' | 'xlsx') => {
    if (!dateRange || !dateRange.from) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date range for the report.' });
      return;
    }
    const received = await getPaidReceivablesForDateRange(userId, dateRange.from, dateRange.to);

    if (received.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No payments were received in this date range.' });
      return;
    }
    if (formatType === 'pdf') {
      generateReceivedPaymentsPdf(received, dateRange, authUser!);
    } else {
      generateReceivedPaymentsXlsx(received);
    }
  };

  const handleDownload = async (formatType: 'pdf' | 'xlsx') => {
    if (!authUser) return;

    if (reportType === 'pending') {
      await handlePendingDuesReport(formatType);
    } else {
      await handleReceivedPaymentsReport(formatType);
    }
    setIsDownloadDialogOpen(false);
  };

  return {
    authUser,
    customers,
    receivedPayments,
    hasMore,
    isInitialLoading,
    isLoadingReceived,
    isLoadingMore,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    dateRange,
    setDateRange,
    reportType,
    setReportType,
    loadInitialData,
    loadReceivedPayments,
    handleLoadMore,
    handleDownload,
  };
}
