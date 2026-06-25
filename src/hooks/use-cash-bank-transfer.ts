'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { getAccountBalances, getTransfersPaginated, recordTransfer } from '@/lib/actions';
import type { Transfer } from '@/lib/types';
import { transferSchema, type TransferFormValues } from '@/components/transfer/schema';

interface UseCashBankTransferProps {
  userId: string;
}

export function useCashBankTransfer({ userId }: UseCashBankTransferProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoadingBalances, setIsLoadingBalances] = React.useState(true);
    const [balances, setBalances] = React.useState({ cash: 0, bank: 0 });

    const [transfers, setTransfers] = React.useState<Transfer[]>([]);
    const [isLoadingTransfers, setIsLoadingTransfers] = React.useState(true);
    const [hasMore, setHasMore] = React.useState(true);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);

    const fetchBalances = React.useCallback(async () => {
        setIsLoadingBalances(true);
        try {
            const balanceData = await getAccountBalances(userId);
            setBalances({ cash: balanceData.cash, bank: balanceData.bank });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch account balances.' });
        } finally {
            setIsLoadingBalances(false);
        }
    }, [userId, toast]);

    const fetchTransfers = React.useCallback(async () => {
        setIsLoadingTransfers(true);
        try {
            const { transfers, hasMore } = await getTransfersPaginated({ userId, pageLimit: 5 });
            setTransfers(transfers);
            setHasMore(hasMore);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transfer history.' });
        } finally {
            setIsLoadingTransfers(false);
        }
    }, [userId, toast]);

    React.useEffect(() => {
        if (userId) {
            fetchBalances();
            fetchTransfers();
        }
    }, [userId, fetchBalances, fetchTransfers]);

    const handleLoadMore = async () => {
        if (!hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
        const lastTransferId = transfers[transfers.length - 1]?.id;
        try {
            const { transfers: newTransfers, hasMore: newHasMore } = await getTransfersPaginated({ userId, pageLimit: 5, lastVisibleId: lastTransferId });
            setTransfers(prev => [...prev, ...newTransfers]);
            setHasMore(newHasMore);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load more transfers.' });
        } finally {
            setIsLoadingMore(false);
        }
    };

    const form = useForm<TransferFormValues>({
        resolver: zodResolver(transferSchema),
        defaultValues: {
            amount: 0,
            date: new Date(),
        },
    });

    const onSubmit = async (data: TransferFormValues) => {
        setIsSubmitting(true);
        try {
            await recordTransfer(userId, data);
            toast({
                title: 'Transfer Successful',
                description: `Successfully transferred ৳${data.amount} from ${data.from} to ${data.to}.`,
            });
            form.reset({ amount: 0, from: undefined, to: undefined, date: new Date() });
            await fetchBalances(); // Re-fetch balances after transfer
            await fetchTransfers(); // Re-fetch transfers list
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Uh oh! Something went wrong.',
                description: error instanceof Error ? error.message : 'Could not record the transfer. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

    return {
      isSubmitting,
      isLoadingBalances,
      balances,
      transfers,
      isLoadingTransfers,
      hasMore,
      isLoadingMore,
      form,
      onSubmit,
      handleLoadMore,
      formatCurrency,
      fetchBalances,
      fetchTransfers,
    };
}
