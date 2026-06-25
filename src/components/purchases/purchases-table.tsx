'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import type { Purchase } from '@/lib/types';

interface PurchasesTableProps {
  purchases: Purchase[];
  isInitialLoading: boolean;
}

export function PurchasesTable({
  purchases,
  isInitialLoading,
}: PurchasesTableProps) {
  const { authUser } = useAuth();
  const storeType = authUser?.storeType || 'general';

  return (
    <div className="border rounded-md overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="hidden sm:table-cell">Purchase ID</TableHead>
            <TableHead>{storeType === 'pharmacy' ? 'Company' : 'Supplier'}</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="hidden sm:table-cell">Payment</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Discount</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isInitialLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : purchases.length > 0 ? purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>{format(new Date(purchase.date), 'PPP')}</TableCell>
              <TableCell className="font-mono hidden sm:table-cell">{purchase.purchaseId}</TableCell>
              <TableCell className="font-medium">{purchase.supplier}</TableCell>
              <TableCell className="max-w-[300px] truncate">
                {purchase.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{purchase.paymentMethod}</TableCell>
              <TableCell className="text-right font-medium hidden sm:table-cell">৳{purchase.totalAmount.toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{purchase.discountAmount ? `৳${purchase.discountAmount.toFixed(2)}` : '-'}</TableCell>
              <TableCell className="text-right font-bold">৳{(purchase.totalAmount + (purchase.vatAmount || 0) - (purchase.discountAmount || 0)).toFixed(2)}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No purchases recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
