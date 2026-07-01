'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { calculateClosingStock } from '@/lib/actions';
import { exportClosingStockPdf, exportClosingStockXlsx } from '@/components/items/items-export-utils';
import type { ClosingStock } from '@/lib/types';

interface UseClosingStockProps {
  userId: string;
  authUser: any;
}

export function useClosingStock({ userId, authUser }: UseClosingStockProps) {
  const { toast } = useToast();
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [closingStockDate, setClosingStockDate] = React.useState<Date | undefined>(new Date());
  const [closingStockData, setClosingStockData] = React.useState<ClosingStock[]>([]);
  const [isCalculating, setIsCalculating] = React.useState(false);

  const handleCalculateClosingStock = async () => {
    if (!closingStockDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date.' });
      return;
    }

    setIsCalculating(true);
    try {
      const calculatedData = await calculateClosingStock(userId, closingStockDate);
      setClosingStockData(calculatedData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not calculate closing stock.' });
    } finally {
      setIsCalculating(false);
      setIsStockDialogOpen(false);
    }
  };

  const handleDownloadClosingStockPdf = () => {
    if (!closingStockDate) return;
    exportClosingStockPdf(closingStockData, closingStockDate, authUser);
  };

  const handleDownloadClosingStockXlsx = () => {
    if (!closingStockDate) return;
    exportClosingStockXlsx(closingStockData, closingStockDate, authUser?.storeType);
  };

  return {
    isStockDialogOpen,
    setIsStockDialogOpen,
    closingStockDate,
    setClosingStockDate,
    closingStockData,
    setClosingStockData,
    isCalculating,
    handleCalculateClosingStock,
    handleDownloadClosingStockPdf,
    handleDownloadClosingStockXlsx,
  };
}
