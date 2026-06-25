'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DateRange } from 'react-day-picker';
import { addDonation, getDonations, getDonationsPaginated } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Donation } from '@/lib/types';
import { donationSchema, type DonationFormValues } from '@/components/donations/schema';
import { exportDonationsToPdf, exportDonationsToXlsx } from '@/components/donations/donations-export-utils';

interface UseDonationsManagementProps {
  userId: string;
}

export function useDonationsManagement({ userId }: UseDonationsManagementProps) {
  const { authUser } = useAuth();
  const [donations, setDonations] = React.useState<Donation[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { donations: newDonations, hasMore: newHasMore } = await getDonationsPaginated({
        userId,
        pageLimit: 10,
      });
      setDonations(newDonations);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load donations.' });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId, loadInitialData]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastDonationId = donations.length > 0 ? donations[donations.length - 1]?.id : undefined;
    try {
      const { donations: newDonations, hasMore: newHasMore } = await getDonationsPaginated({
        userId,
        pageLimit: 10,
        lastVisibleId: lastDonationId,
      });
      setDonations((prev) => [...prev, ...newDonations]);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load more donations.' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      donorName: '',
      amount: 0,
      paymentMethod: 'Cash',
      notes: '',
    },
  });

  const handleAddNew = () => {
    form.reset({ donorName: '', amount: 0, date: new Date(), paymentMethod: 'Cash', notes: '' });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: DonationFormValues) => {
    startTransition(async () => {
      try {
        const newDonation = await addDonation(userId, data);
        setDonations((prev) => [newDonation, ...prev]);
        toast({ title: 'Donation Added', description: 'The new donation has been recorded.' });
        setIsDialogOpen(false);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record donation.' });
      }
    });
  };

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
    donations,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isDialogOpen,
    setIsDialogOpen,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    dateRange,
    setDateRange,
    form,
    isPending,
    handleLoadMore,
    handleAddNew,
    onSubmit,
    handleDownloadPdf,
    handleDownloadXlsx,
  };
}
