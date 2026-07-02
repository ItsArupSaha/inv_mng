'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Download, Scale } from 'lucide-react';
import { BalanceSheetTables } from './balance-sheet-tables';

interface BalanceSheetTableCardProps {
    current: any;
    isLoading: boolean;
    asOfDate: Date | undefined;
    setAsOfDate: (date: Date | undefined) => void;
    handleDownloadPdf: () => void;
    formatCurrency: (amount: number) => string;
}

export function BalanceSheetTableCard({
    current,
    isLoading,
    asOfDate,
    setAsOfDate,
    handleDownloadPdf,
    formatCurrency,
}: BalanceSheetTableCardProps) {
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

    return (
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
    );
}
