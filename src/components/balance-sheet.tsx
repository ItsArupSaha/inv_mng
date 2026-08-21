'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAccountOverview, getCapitalHistory, getSecurityDeposits } from '@/lib/actions';
import type { Capital, SecurityDeposit } from '@/lib/types';
import { exportBalanceSheetPdf } from './balance-sheet/balance-sheet-pdf';
import { BalanceSheetTableCard } from './balance-sheet/balance-sheet-table-card';
import { BalanceSheetTabsAndDialogs } from './balance-sheet/balance-sheet-tabs-and-dialogs';

interface BalanceSheetProps {
  userId: string;
}

type Overview = Awaited<ReturnType<typeof getAccountOverview>>;

const formatCurrency = (amount: number) =>
  `৳ ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BalanceSheet({ userId }: BalanceSheetProps) {
  const { authUser } = useAuth();
  const [asOfDate, setAsOfDate] = React.useState<Date | undefined>(undefined);
  const [current, setCurrent] = React.useState<Overview | null>(null);
  const [capitalHistory, setCapitalHistory] = React.useState<Capital[]>([]);
  const [securityHistory, setSecurityHistory] = React.useState<SecurityDeposit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updateTrigger, setUpdateTrigger] = React.useState(0);

  const loadData = React.useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      let targetDate = asOfDate ?? new Date();

      if (asOfDate) {
        targetDate = new Date(asOfDate);
        targetDate.setHours(23, 59, 59, 999);
      }

      const [currentSnapshot, history, security] = await Promise.all([
        getAccountOverview(userId, targetDate),
        getCapitalHistory(userId),
        getSecurityDeposits(userId),
      ]);

      setCurrent(currentSnapshot);
      setCapitalHistory(history);
      setSecurityHistory(security);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, asOfDate, updateTrigger]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuccess = () => {
    setUpdateTrigger((prev) => prev + 1);
  };

  const handleDownloadPdf = () => {
    if (!current) return;
    const effectiveDate = asOfDate ?? new Date();
    exportBalanceSheetPdf(current, effectiveDate, asOfDate, authUser);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50">
      {/* Main Balance Sheet Table Card */}
      <BalanceSheetTableCard
        current={current}
        isLoading={isLoading}
        asOfDate={asOfDate}
        setAsOfDate={setAsOfDate}
        handleDownloadPdf={handleDownloadPdf}
        formatCurrency={formatCurrency}
      />

      {/* Bottom section with Tabs for Capital and Security deposits */}
      {!isLoading && current && (
        <BalanceSheetTabsAndDialogs
          userId={userId}
          current={current}
          capitalHistory={capitalHistory}
          securityHistory={securityHistory}
          onSuccess={handleSuccess}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}
