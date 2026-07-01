'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { getPaidPayablesForDateRange, getTransactionsPaginated } from '@/lib/actions';
import { getPayablesAsOfDate } from '@/lib/db/account-overview';
import {
  generatePendingPayablesPdf,
  generatePendingPayablesXlsx,
  generatePaidPayablesPdf,
  generatePaidPayablesXlsx,
} from '@/components/payables/payables-export-utils';

interface UsePayablesExportProps {
  userId: string;
  authUser: any;
  asOfDate: Date | undefined;
  dateRange: DateRange | undefined;
  reportType: 'pending' | 'paid';
  setIsDownloadDialogOpen: (open: boolean) => void;
}

export function usePayablesExport({
  userId,
  authUser,
  asOfDate,
  dateRange,
  reportType,
  setIsDownloadDialogOpen,
}: UsePayablesExportProps) {
  const { toast } = useToast();

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
    handleDownload,
  };
}
