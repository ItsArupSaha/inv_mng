'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transaction } from '@/lib/types';

interface PaidHistoryTableProps {
  paidPayables: Transaction[];
  isLoading: boolean;
}

export function PaidHistoryTable({ paidPayables, isLoading }: PaidHistoryTableProps) {
  return (
    <div className="border rounded-md overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Date Paid</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={`paid-skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-3/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-1/4 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : paidPayables.length > 0 ? (
            paidPayables.map((payable) => (
              <TableRow key={payable.id}>
                <TableCell className="font-medium">{payable.description}</TableCell>
                <TableCell>{format(new Date(payable.dueDate), 'PPP')}</TableCell>
                <TableCell>{payable.paymentMethod || 'Cash'}</TableCell>
                <TableCell className="text-right text-primary font-bold">
                  ৳{payable.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                No paid payables yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
