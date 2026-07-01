'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { getDonations } from '@/lib/actions';
import { exportDonationsToPdf, exportDonationsToXlsx } from '@/components/donations/donations-export-utils';

interface UseDonationsExportProps {
  userId: string;
  authUser: any;
  dateRange: DateRange | undefined;
}

export function useDonationsExport({ userId, authUser, dateRange }: UseDonationsExportProps) {
  const { toast } = useToast();

  const getFilteredDonations = async () => {
    if (!dateRange?.from) {
      toast({
        variant: 'destructive',
        title: 'Please select a start date.',
      });
      return null;
    }

    try {
      const allDonations = await getDonations(userId);
      const from = dateRange.from;
      const to = dateRange.to || dateRange.from;
      const tempTo = new Date(to);
      tempTo.setHours(23, 59, 59, 999);

      return allDonations.filter((donation) => {
        const donationDate = new Date(donation.date);
        return donationDate >= from && donationDate <= tempTo;
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not filter donations.' });
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    const filtered = await getFilteredDonations();
    if (!filtered || !authUser) return;

    if (filtered.length === 0) {
      toast({
        title: 'No Donations Found',
        description: 'There are no donations in the selected date range.',
      });
      return;
    }

    exportDonationsToPdf(filtered, authUser, { from: dateRange!.from!, to: dateRange!.to });
  };

  const handleDownloadXlsx = async () => {
    const filtered = await getFilteredDonations();
    if (!filtered) return;

    if (filtered.length === 0) {
      toast({
        title: 'No Donations Found',
        description: 'There are no donations in the selected date range.',
      });
      return;
    }

    exportDonationsToXlsx(filtered, { from: dateRange!.from!, to: dateRange!.to });
  };

  return {
    handleDownloadPdf,
    handleDownloadXlsx,
  };
}
