'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { downloadExpensesPdf, downloadExpensesXlsx } from '@/components/expenses/expenses-export-utils';

interface UseExpensesExportProps {
  userId: string;
  dateRange: DateRange | undefined;
  authUser: any;
  setIsDownloadDialogOpen: (open: boolean) => void;
}

export function useExpensesExport({
  userId,
  dateRange,
  authUser,
  setIsDownloadDialogOpen,
}: UseExpensesExportProps) {
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    try {
      const success = await downloadExpensesPdf(userId, dateRange, authUser);
      if (!success) {
        toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      }
      setIsDownloadDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download PDF.' });
    }
  };

  const handleDownloadXlsx = async () => {
    try {
      const success = await downloadExpensesXlsx(userId, dateRange);
      if (!success) {
        toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      }
      setIsDownloadDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download Excel.' });
    }
  };

  return {
    handleDownloadPdf,
    handleDownloadXlsx,
  };
}
