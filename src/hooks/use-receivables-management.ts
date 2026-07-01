'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomersWithDueBalancePaginated,
  getPaidReceivablesForDateRange,
} from '@/lib/actions';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import { useReceivablesExport } from './use-receivables-export';

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

  // Call the receivables export sub-hook
  const receivablesExport = useReceivablesExport({
    userId,
    authUser,
    dateRange,
    reportType,
    setIsDownloadDialogOpen,
  });

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
    handleDownload: receivablesExport.handleDownload,
  };
}
