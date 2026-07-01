'use client';

import * as React from 'react';
import { handleDownloadPdf, handleDownloadXlsx } from '@/components/expiry/expiry-export-utils';
import type { Item } from '@/lib/types';

interface UseExpiryExportProps {
  authUser: any;
}

export function useExpiryExport({ authUser }: UseExpiryExportProps) {
  const handlePdf = (items: Item[]) => {
    handleDownloadPdf(items, authUser);
  };

  const handleXlsx = (items: Item[]) => {
    handleDownloadXlsx(items);
  };

  return {
    handlePdf,
    handleXlsx,
  };
}
