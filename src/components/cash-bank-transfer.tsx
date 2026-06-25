'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import * as React from 'react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Skeleton } from './ui/skeleton';
import { TransferHistoryTable } from './transfer/transfer-history-table';
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
                    <CardDescription>
                        Move funds between your cash and bank accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Current Cash Balance</p>
                            {isLoadingBalances ? <Skeleton className="h-7 w-24 mx-auto mt-1" /> : <p className="text-2xl font-bold">{formatCurrency(balances.cash)}</p>}
                        </div>
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Current Bank Balance</p>
                            {isLoadingBalances ? <Skeleton className="h-7 w-24 mx-auto mt-1" /> : <p className="text-2xl font-bold">{formatCurrency(balances.bank)}</p>}
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="from"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>From</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Cash" /></FormControl>
                                                        <FormLabel className="font-normal">Cash</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Bank" /></FormControl>
                                                        <FormLabel className="font-normal">Bank</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="to"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>To</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Cash" /></FormControl>
                                                        <FormLabel className="font-normal">Cash</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Bank" /></FormControl>
                                                        <FormLabel className="font-normal">Bank</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Transfer Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-[240px] pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date > new Date()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <CardFooter className="px-0 pt-6">
                                <Button type="submit" disabled={isSubmitting || isLoadingBalances}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Transfer
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
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
