'use client';

import { handleDownloadPdf, handleDownloadXlsx } from '@/components/expiry/expiry-export-utils';
import type { Item } from '@/lib/types';

interface UseExpiryExportProps {
  authUser: any;
}

export function useExpiryExport({ authUser }: UseExpiryExportProps) {
  const handlePdf = (items: Item[], reportTitle: string) => {
    handleDownloadPdf(items, authUser, reportTitle);
  };

  const handleXlsx = (items: Item[], reportTitle: string) => {
    handleDownloadXlsx(items, reportTitle);
  };

  return {
    handlePdf,
    handleXlsx,
  };
}
