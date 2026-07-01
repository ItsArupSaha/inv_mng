'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DateRange } from 'react-day-picker';
import { addDonation, getDonationsPaginated } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Donation } from '@/lib/types';
import { donationSchema, type DonationFormValues } from '@/components/donations/schema';
import { useDonationsExport } from './use-donations-export';

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

  // Call the donations export sub-hook
  const donationsExport = useDonationsExport({
    userId,
    authUser,
    dateRange,
  });

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
    handleDownloadPdf: donationsExport.handleDownloadPdf,
    handleDownloadXlsx: donationsExport.handleDownloadXlsx,
  };
}
