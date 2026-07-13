'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Wallet, Landmark, PlusCircle } from 'lucide-react';
import type { Capital } from '@/lib/types';
import { CapitalHistoryLog } from './capital-history-log';

interface CapitalManagementTabProps {
  current: {
    cash: number;
    bank: number;
  };
  capitalHistory: Capital[];
  formatCurrency: (amount: number) => string;
  onAddCapital: () => void;
  onEditCapital: (cap: Capital) => void;
  onDeleteCapital: (capId: string) => void;
}

export function CapitalManagementTab({
  current,
  capitalHistory,
  formatCurrency,
  onAddCapital,
  onEditCapital,
  onDeleteCapital,
}: CapitalManagementTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add Capital Form Box */}
      <Card className="lg:col-span-1 border border-muted/60 shadow-sm flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Capital Management
          </CardTitle>
          <CardDescription>
            Monitor liquid cash vs bank balances and add more capital to your operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-4 border border-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary/70" />
                Cash Account:
              </span>
              <span className="font-semibold text-sm font-headline">{formatCurrency(current.cash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary/70" />
                Bank Account:
              </span>
              <span className="font-semibold text-sm font-headline">{formatCurrency(current.bank)}</span>
            </div>
            <div className="border-t border-muted pt-2 flex items-center justify-between text-primary">
              <span className="text-xs font-semibold">Total Liquidity:</span>
              <span className="font-bold text-sm font-headline">
                {formatCurrency(current.cash + current.bank)}
              </span>
            </div>
          </div>
        </CardContent>
        <div className="p-6 pt-0">
          <Button onClick={onAddCapital} className="w-full flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add More Capital
          </Button>
        </div>
      </Card>

      {/* Capital History List */}
      <CapitalHistoryLog
        capitalHistory={capitalHistory}
        onEditCapital={onEditCapital}
        onDeleteCapital={onDeleteCapital}
      />
    </div>
  );
}
