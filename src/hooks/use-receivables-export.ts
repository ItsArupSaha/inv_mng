'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { getCustomersWithDueBalance, getPaidReceivablesForDateRange } from '@/lib/actions';
import {
  generatePdf,
  generateXlsx,
  generateReceivedPaymentsPdf,
  generateReceivedPaymentsXlsx,
} from '@/components/receivables/receivables-export-utils';

interface UseReceivablesExportProps {
  userId: string;
  authUser: any;
  dateRange: DateRange | undefined;
  reportType: 'pending' | 'received';
  setIsDownloadDialogOpen: (open: boolean) => void;
}

export function useReceivablesExport({
  userId,
  authUser,
  dateRange,
  reportType,
  setIsDownloadDialogOpen,
}: UseReceivablesExportProps) {
  const { toast } = useToast();

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
    handleDownload,
  };
}
