'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Item } from '@/lib/types';
import {
  downloadSalesPdf,
  downloadSalesXlsx,
  downloadSalesItemsPdf,
  downloadSalesItemsXlsx,
} from '@/components/sales/sales-export-utils';

interface UseSalesExportProps {
  userId: string;
  dateRange: DateRange | undefined;
  authUser: any;
  items: Item[];
  customers: Customer[];
}

export function useSalesExport({
  userId,
  dateRange,
  authUser,
  items,
  customers,
}: UseSalesExportProps) {
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    try {
      const success = await downloadSalesPdf(userId, dateRange, authUser, items, customers);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download PDF.' });
    }
  };

  const handleDownloadXlsx = async () => {
    try {
      const success = await downloadSalesXlsx(userId, dateRange, items, customers);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download Excel.' });
    }
  };

  const handleDownloadItemsPdf = async () => {
    try {
      const success = await downloadSalesItemsPdf(userId, dateRange, authUser, items);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download PDF.' });
    }
  };

  const handleDownloadItemsXlsx = async () => {
    try {
      const success = await downloadSalesItemsXlsx(userId, dateRange, items);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download Excel.' });
    }
  };

  return {
    handleDownloadPdf,
    handleDownloadXlsx,
    handleDownloadItemsPdf,
    handleDownloadItemsXlsx,
  };
}
