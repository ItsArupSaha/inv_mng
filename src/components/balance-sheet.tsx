'use client';

import { format } from 'date-fns';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { getAccountOverview, getCapitalHistory } from '@/lib/actions';
import type { Capital } from '@/lib/types';
import { CalendarIcon, Download, Landmark, PlusCircle, Scale, Store, Wallet, Receipt, Coins, History } from 'lucide-react';
import { exportBalanceSheetPdf } from './balance-sheet/balance-sheet-pdf';
import { BalanceSheetTables } from './balance-sheet/balance-sheet-tables';
import { AddCapitalDialog } from './balance-sheet/add-capital-dialog';

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
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAddCapitalOpen, setIsAddCapitalOpen] = React.useState(false);
    const [updateTrigger, setUpdateTrigger] = React.useState(0);

    const loadData = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            let targetDate = asOfDate ?? new Date();

            // If a specific date is selected, set it to the end of that day to include all transactions
            if (asOfDate) {
                targetDate = new Date(asOfDate);
                targetDate.setHours(23, 59, 59, 999);
            }

            const [currentSnapshot, history] = await Promise.all([
                getAccountOverview(userId, targetDate),
                getCapitalHistory(userId)
            ]);

            setCurrent(currentSnapshot);
            setCapitalHistory(history);
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
        setUpdateTrigger(prev => prev + 1);
    };

    const renderSkeleton = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
            </div>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );

    const effectiveDate = asOfDate ?? new Date();
    const monthLabel = format(effectiveDate, 'MMMM yyyy');

    const handleDownloadPdf = () => {
        if (!current) return;
        exportBalanceSheetPdf(current, effectiveDate, asOfDate, authUser);
    };

    // Calculate total starting capital
    const startingCapital = (current?.initialCashCapital || 0) + (current?.initialBankCapital || 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50">
            {/* KPI Overview Cards */}
            {!isLoading && current && (
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
            )}

            {/* Main Balance Sheet Card */}
            <Card className="border border-muted/60 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <Scale className="h-6 w-6 text-primary" />
                            Business Overview & Balance Sheet
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Snapshot of starting capital, inventory stocks, liabilities, and current equity as of a specific date.
                        </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto justify-start border-muted">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {asOfDate ? format(asOfDate, 'PPP') : 'As of Today'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={asOfDate}
                                    onSelect={setAsOfDate}
                                    initialFocus
                                />
                                {asOfDate && (
                                    <div className="p-3 border-t">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setAsOfDate(undefined)}
                                        >
                                            View Today
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                        <Button
                            onClick={handleDownloadPdf}
                            variant="outline"
                            disabled={isLoading || !current}
                            className="w-full sm:w-auto border-muted"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading || !current ? (
                        renderSkeleton()
                    ) : (
                        <div className="space-y-8">
                            <div className="text-sm text-muted-foreground flex items-center justify-between">
                                <div>
                                    Showing balances for{' '}
                                    <span className="font-medium text-foreground">
                                        {format(effectiveDate, 'PPP')}
                                    </span>{' '}
                                    (month: {monthLabel})
                                </div>
                                <div className="text-xs">
                                    Opening balances taken from the previous month.
                                </div>
                            </div>

                            <BalanceSheetTables
                                current={current}
                                formatCurrency={formatCurrency}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Capital Injection & History Section */}
            {!isLoading && current && (
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
                                    <span className="font-bold text-sm font-headline">{formatCurrency(current.cash + current.bank)}</span>
                                </div>
                            </div>
                        </CardContent>
                        <div className="p-6 pt-0">
                            <Button onClick={() => setIsAddCapitalOpen(true)} className="w-full flex items-center gap-2">
                                <PlusCircle className="h-4 w-4" />
                                Add More Capital
                            </Button>
                        </div>
                    </Card>

                    {/* Capital History List */}
                    <Card className="lg:col-span-2 border border-muted/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="font-headline text-lg flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                Capital History & Log
                            </CardTitle>
                            <CardDescription>
                                Record of initial starting capital and all subsequent additions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md overflow-x-auto max-h-[220px]">
                                <Table>
                                    <TableHeader className="bg-muted/30 sticky top-0">
                                        <TableRow>
                                            <TableHead className="py-2.5">Date</TableHead>
                                            <TableHead className="py-2.5">Source</TableHead>
                                            <TableHead className="py-2.5">Method</TableHead>
                                            <TableHead className="py-2.5">Notes</TableHead>
                                            <TableHead className="text-right py-2.5">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {capitalHistory.length > 0 ? (
                                            capitalHistory.map((cap) => (
                                                <TableRow key={cap.id} className="hover:bg-muted/10">
                                                    <TableCell className="py-2 text-xs">
                                                        {format(new Date(cap.date), 'dd MMM yyyy')}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                            cap.source === 'Initial Capital' 
                                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' 
                                                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                        }`}>
                                                            {cap.source}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs font-medium">{cap.paymentMethod}</TableCell>
                                                    <TableCell className="py-2 text-xs max-w-[150px] truncate" title={cap.notes || ''}>
                                                        {cap.notes || '-'}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-right text-xs font-semibold font-headline">
                                                        ৳{cap.amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-xs">
                                                    No capital history records found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Capital Form Modal */}
            <AddCapitalDialog
                userId={userId}
                isOpen={isAddCapitalOpen}
                onOpenChange={setIsAddCapitalOpen}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
