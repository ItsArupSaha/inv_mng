'use client';

import * as React from 'react';
import { adjustInitialCapital, getAccountBalances } from '@/lib/actions';

interface UseCapitalAdjustmentsProps {
  userId: string;
  isOpen: boolean;
}

export function useCapitalAdjustments({ userId, isOpen }: UseCapitalAdjustmentsProps) {
  const [balances, setBalances] = React.useState<{ cash: number; bank: number } | null>(null);
  const [isLoadingCapital, setIsLoadingCapital] = React.useState(true);

  React.useEffect(() => {
    async function loadCapital() {
      if (isOpen && userId) {
        setIsLoadingCapital(true);
        try {
          const balanceData = await getAccountBalances(userId);
          setBalances({ cash: balanceData.cash, bank: balanceData.bank });
        } catch (error) {
          console.error('Failed to load initial capital balances:', error);
        } finally {
          setIsLoadingCapital(false);
        }
      }
    }
    loadCapital();
  }, [isOpen, userId]);

  const adjustCapital = async (adjustments: { cash: number; bank: number }) => {
    if (!userId) return;
    await adjustInitialCapital(userId, adjustments);
  };

  return {
    balances,
    isLoadingCapital,
    adjustCapital,
  };
}
