import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomersWithNegativeBalance,
  getPaidPayables,
  getPaidPayablesForDateRange,
  getTransactionsPaginated,
} from '@/lib/actions';
import { getPayablesAsOfDate } from '@/lib/db/account-overview';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import {
  generatePendingPayablesPdf,
  generatePendingPayablesXlsx,
  generatePaidPayablesPdf,
  generatePaidPayablesXlsx,
} from '@/components/payables/payables-export-utils';

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

  const handlePendingPayablesReport = async (formatType: 'pdf' | 'xlsx') => {
    let data;
    const targetDate = asOfDate || new Date();

    if (asOfDate) {
      data = await getPayablesAsOfDate(userId, targetDate);
    } else {
      data = await getTransactionsPaginated({ userId, type: 'Payable', pageLimit: 1000 }).then(
        (res) => res.transactions
      );
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
      generatePaidPayablesPdf(paid, dateRange.from, dateRange.to, authUser!);
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
    handleDownload
  };
}
