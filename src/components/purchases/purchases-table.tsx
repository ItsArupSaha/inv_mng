'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Edit, Undo2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Purchase } from '@/lib/types';

interface PurchasesTableProps {
  purchases: Purchase[];
  isInitialLoading: boolean;
  onEdit?: (purchase: Purchase) => void;
  onReturn?: (purchase: Purchase) => void;
}

export function PurchasesTable({
  purchases,
  isInitialLoading,
  onEdit,
  onReturn,
}: PurchasesTableProps) {
  return (
    <div className="border rounded-md overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="hidden sm:table-cell">Purchase ID</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="hidden sm:table-cell">Payment</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Discount</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
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
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : purchases.length > 0 ? purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>{format(new Date(purchase.date), 'PPP')}</TableCell>
              <TableCell className="font-mono hidden sm:table-cell">{purchase.purchaseId}</TableCell>
              <TableCell className="font-medium max-w-[150px] truncate" title={purchase.supplier}>{purchase.supplier}</TableCell>
              <TableCell className="max-w-[200px] truncate" title={purchase.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}>
                {purchase.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{purchase.paymentMethod}</TableCell>
              <TableCell className="text-right font-medium hidden sm:table-cell">৳{purchase.totalAmount.toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{purchase.discountAmount ? `৳${purchase.discountAmount.toFixed(2)}` : '-'}</TableCell>
              <TableCell className="text-right font-bold">৳{(purchase.totalAmount + (purchase.vatAmount || 0) - (purchase.discountAmount || 0)).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => onEdit?.(purchase)} title="Edit purchase">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onReturn?.(purchase)} title="Return to supplier">
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No purchases recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
