'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Coins, Wallet, Landmark, PlusCircle, History, Edit, Trash2 } from 'lucide-react';
import type { Capital } from '@/lib/types';

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
                            <span className="font-bold text-sm font-headline">{formatCurrency(current.cash + current.bank)}</span>
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
                                    <TableHead className="text-right py-2.5 w-[90px]">Actions</TableHead>
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
                                            <TableCell className="py-2 text-right text-xs">
                                                {cap.paymentMethod !== 'Asset' ? (
                                                    <div className="flex justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6" 
                                                            title="Edit capital entry"
                                                            onClick={() => onEditCapital(cap)}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6 text-destructive" 
                                                            title="Delete capital entry"
                                                            onClick={() => onDeleteCapital(cap.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">Fixed Asset</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-xs">
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
    );
}
