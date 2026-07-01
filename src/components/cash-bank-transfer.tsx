'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import * as React from 'react';
import { Skeleton } from './ui/skeleton';
import { TransferHistoryTable } from './transfer/transfer-history-table';
import { TransferForm } from './transfer/transfer-dialog-form';
import { useCashBankTransfer } from '@/hooks/use-cash-bank-transfer';

interface CashBankTransferProps {
  userId: string;
}

export default function CashBankTransfer({ userId }: CashBankTransferProps) {
  const {
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
  } = useCashBankTransfer({ userId });

  return (
    <div className="space-y-6">
      <Card className="w-full animate-in fade-in-50">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Cash & Bank Transfer</CardTitle>
          <CardDescription>Move funds between your cash and bank accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Current Cash Balance</p>
              {isLoadingBalances ? (
                <Skeleton className="h-7 w-24 mx-auto mt-1" />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(balances.cash)}</p>
              )}
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Current Bank Balance</p>
              {isLoadingBalances ? (
                <Skeleton className="h-7 w-24 mx-auto mt-1" />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(balances.bank)}</p>
              )}
            </div>
          </div>

          <TransferForm
            form={form}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            isLoadingBalances={isLoadingBalances}
          />
        </CardContent>
      </Card>

      <Card className="w-full animate-in fade-in-50">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferHistoryTable
            transfers={transfers}
            isLoadingTransfers={isLoadingTransfers}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            formatCurrency={formatCurrency}
          />
        </CardContent>
      </Card>
    </div>
  );
}
