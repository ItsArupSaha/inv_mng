'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, PlusCircle } from 'lucide-react';
import type { SecurityDeposit } from '@/lib/types';
import { SecurityDepositsLog } from './security-deposits-log';

interface SecurityDepositsTabProps {
  securityHistory: SecurityDeposit[];
  formatCurrency: (amount: number) => string;
  onAddSecurity: () => void;
  onEditSecurity: (sec: SecurityDeposit) => void;
  onDeleteSecurity: (secId: string) => void;
}

export function SecurityDepositsTab({
  securityHistory,
  formatCurrency,
  onAddSecurity,
  onEditSecurity,
  onDeleteSecurity,
}: SecurityDepositsTabProps) {
  const refundableSum = securityHistory
    .filter((s) => s.status === 'Refundable')
    .reduce((sum, s) => sum + s.amount, 0);

  const refundedSum = securityHistory
    .filter((s) => s.status === 'Refunded')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalSum = securityHistory.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Security Summary Card */}
      <Card className="lg:col-span-1 border border-muted/60 shadow-sm flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Security Deposits
          </CardTitle>
          <CardDescription>
            Manage refundable deposits paid for renting rooms, spaces, or other business investments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-4 border border-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Active (Refundable):</span>
              <span className="font-semibold text-sm font-headline text-primary">
                {formatCurrency(refundableSum)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Settled (Refunded):</span>
              <span className="font-semibold text-sm font-headline text-muted-foreground">
                {formatCurrency(refundedSum)}
              </span>
            </div>
            <div className="border-t border-muted pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold">Total Recorded:</span>
              <span className="font-bold text-sm font-headline">{formatCurrency(totalSum)}</span>
            </div>
          </div>
        </CardContent>
        <div className="p-6 pt-0">
          <Button onClick={onAddSecurity} className="w-full flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Security Deposit
          </Button>
        </div>
      </Card>

      {/* Security Deposits History List */}
      <SecurityDepositsLog
        securityHistory={securityHistory}
        onEditSecurity={onEditSecurity}
        onDeleteSecurity={onDeleteSecurity}
      />
    </div>
  );
}
