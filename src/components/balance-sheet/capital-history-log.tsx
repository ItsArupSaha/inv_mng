'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Edit, Trash2 } from 'lucide-react';
import type { Capital } from '@/lib/types';

interface CapitalHistoryLogProps {
  capitalHistory: Capital[];
  onEditCapital: (cap: Capital) => void;
  onDeleteCapital: (capId: string) => void;
}

export function CapitalHistoryLog({
  capitalHistory,
  onEditCapital,
  onDeleteCapital,
}: CapitalHistoryLogProps) {
  return (
    <Card className="lg:col-span-2 border border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Capital History & Log
        </CardTitle>
        <CardDescription>Record of initial starting capital and all subsequent additions.</CardDescription>
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
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          cap.source === 'Initial Capital'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                        }`}
                      >
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
  );
}
