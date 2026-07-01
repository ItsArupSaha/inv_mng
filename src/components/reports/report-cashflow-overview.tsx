'use client';

import * as React from 'react';

interface ReportCashflowOverviewProps {
  salesBreakdown: {
    paid: number;
    due: number;
  };
  cashFlow: {
    sales: { cash: number; bank: number };
    duePayments: { cash: number; bank: number };
    donations: { cash: number; bank: number };
    expenses: { cash: number; bank: number };
  };
  formatCurrency: (amount: number) => string;
}

export function ReportCashflowOverview({
  salesBreakdown,
  cashFlow,
  formatCurrency,
}: ReportCashflowOverviewProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold font-headline">Cash Flow Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-primary/5">
          <p className="text-xs text-muted-foreground mb-1">Sales Overview</p>
          <div className="flex justify-between text-sm">
            <span>Paid Sale</span>
            <span className="font-semibold">{formatCurrency(salesBreakdown.paid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Due Sale</span>
            <span className="font-semibold">{formatCurrency(salesBreakdown.due)}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-primary/5">
          <p className="text-xs text-muted-foreground mb-1">Sales</p>
          <div className="flex justify-between text-sm">
            <span>Cash</span>
            <span className="font-semibold">{formatCurrency(cashFlow.sales.cash)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Bank</span>
            <span className="font-semibold">{formatCurrency(cashFlow.sales.bank)}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-primary/5">
          <p className="text-xs text-muted-foreground mb-1">Due Payments (Received)</p>
          <div className="flex justify-between text-sm">
            <span>Cash</span>
            <span className="font-semibold">{formatCurrency(cashFlow.duePayments.cash)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Bank</span>
            <span className="font-semibold">{formatCurrency(cashFlow.duePayments.bank)}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-xs text-muted-foreground mb-1">Donations</p>
          <div className="flex justify-between text-sm">
            <span>Cash</span>
            <span className="font-semibold">{formatCurrency(cashFlow.donations.cash)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Bank</span>
            <span className="font-semibold">{formatCurrency(cashFlow.donations.bank)}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
          <p className="text-xs text-muted-foreground mb-1">Expenses (Outflow)</p>
          <div className="flex justify-between text-sm">
            <span>Cash</span>
            <span className="font-semibold text-destructive">({formatCurrency(cashFlow.expenses.cash)})</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Bank</span>
            <span className="font-semibold text-destructive">({formatCurrency(cashFlow.expenses.bank)})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
