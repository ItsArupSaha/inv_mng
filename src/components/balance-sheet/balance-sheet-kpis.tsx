'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Store, Receipt, Scale } from 'lucide-react';

interface BalanceSheetKpisProps {
    current: {
        initialCashCapital: number;
        initialBankCapital: number;
        stockValue: number;
        totalStockCount: number;
        totalExpenses: number;
        retainedEarnings: number;
    };
    formatCurrency: (amount: number) => string;
}

export function BalanceSheetKpis({ current, formatCurrency }: BalanceSheetKpisProps) {
    const startingCapital = (current.initialCashCapital || 0) + (current.initialBankCapital || 0);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Started Capital</CardTitle>
                    <Coins className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold font-headline">{formatCurrency(startingCapital)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        Cash: ৳{(current.initialCashCapital || 0).toLocaleString()} | Bank: ৳{(current.initialBankCapital || 0).toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-emerald-500/10 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Stock</CardTitle>
                    <Store className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold font-headline">{formatCurrency(current.stockValue || 0)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        {(current.totalStockCount || 0).toLocaleString()} units in inventory
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500/5 via-transparent to-transparent border-rose-500/10 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Expenses</CardTitle>
                    <Receipt className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold font-headline">{formatCurrency(current.totalExpenses || 0)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        All-time business operations expenses
                    </p>
                </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br border-muted/50 hover:shadow-md transition-all duration-200 ${current.retainedEarnings >= 0 ? 'from-emerald-500/10' : 'from-rose-500/10'} via-transparent to-transparent`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Profit / Loss</CardTitle>
                    <Scale className={`h-4 w-4 ${current.retainedEarnings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-xl font-bold font-headline ${current.retainedEarnings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(current.retainedEarnings || 0)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        Accumulated business earnings
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
