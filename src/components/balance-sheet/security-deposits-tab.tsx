'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, PlusCircle, History, Edit, Trash2 } from 'lucide-react';
import type { SecurityDeposit } from '@/lib/types';

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
        .filter(s => s.status === 'Refundable')
        .reduce((sum, s) => sum + s.amount, 0);

    const refundedSum = securityHistory
        .filter(s => s.status === 'Refunded')
        .reduce((sum, s) => sum + s.amount, 0);

    const totalSum = securityHistory
        .reduce((sum, s) => sum + s.amount, 0);

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
                            <span className="font-bold text-sm font-headline">
                                {formatCurrency(totalSum)}
                            </span>
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
            <Card className="lg:col-span-2 border border-muted/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Security Deposit Log
                    </CardTitle>
                    <CardDescription>
                        History of all refundable security deposits paid and their current status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md overflow-x-auto max-h-[220px]">
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0">
                                <TableRow>
                                    <TableHead className="py-2.5">Date</TableHead>
                                    <TableHead className="py-2.5">ID</TableHead>
                                    <TableHead className="py-2.5">Paid Via</TableHead>
                                    <TableHead className="py-2.5">Status</TableHead>
                                    <TableHead className="py-2.5">Notes</TableHead>
                                    <TableHead className="text-right py-2.5">Amount</TableHead>
                                    <TableHead className="text-right py-2.5 w-[90px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {securityHistory.length > 0 ? (
                                    securityHistory.map((sec) => (
                                        <TableRow key={sec.id} className="hover:bg-muted/10">
                                            <TableCell className="py-2 text-xs">
                                                {format(new Date(sec.date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell className="py-2 text-xs font-semibold font-mono">
                                                {sec.securityId}
                                            </TableCell>
                                            <TableCell className="py-2 text-xs font-medium">{sec.paymentMethod}</TableCell>
                                            <TableCell className="py-2 text-xs">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                    sec.status === 'Refundable' 
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' 
                                                        : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    {sec.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs max-w-[150px] truncate" title={sec.notes || ''}>
                                                {sec.notes || '-'}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs font-semibold font-headline">
                                                ৳{sec.amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6" 
                                                        title="Edit security deposit"
                                                        onClick={() => onEditSecurity(sec)}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 text-destructive" 
                                                        title="Delete security deposit"
                                                        onClick={() => onDeleteSecurity(sec.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-xs">
                                            No security deposit records found.
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
