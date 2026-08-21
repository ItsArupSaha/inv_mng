'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getSupplierLedgerDetail } from '@/lib/actions';
import type { SupplierLedgerEntry } from '@/lib/supplier-ledger';

interface SupplierLedgerDialogProps {
  userId: string;
  supplier: string | null;
  onOpenChange: (open: boolean) => void;
}

const ENTRY_LABELS: Record<SupplierLedgerEntry['type'], string> = {
  purchase: 'Purchase',
  payment: 'Payment',
  return: 'Return',
};

export function SupplierLedgerDialog({ userId, supplier, onOpenChange }: SupplierLedgerDialogProps) {
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<SupplierLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!supplier) return;
    setIsLoading(true);
    getSupplierLedgerDetail(userId, supplier)
      .then(setEntries)
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to load ledger.' }))
      .finally(() => setIsLoading(false));
  }, [userId, supplier, toast]);

  const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

  return (
    <Dialog open={!!supplier} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{supplier}</DialogTitle>
          <DialogDescription>
            Purchase and payment history. Closing balance is what you still owe.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="hidden sm:table-cell">Details</TableHead>
                  <TableHead className="text-right">Debit (+)</TableHead>
                  <TableHead className="text-right">Credit (−)</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-3/4" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : entries.length > 0 ? entries.map((entry, i) => (
                  <TableRow key={`${entry.reference}-${i}`}>
                    <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'dd MMM yy')}</TableCell>
                    <TableCell>{ENTRY_LABELS[entry.type]}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                    <TableCell className="hidden sm:table-cell max-w-[200px] truncate" title={entry.description}>
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-right">{entry.debit > 0 ? `৳${entry.debit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right">{entry.credit !== 0 ? `৳${entry.credit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right font-medium">৳{entry.balance.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No history for this supplier.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        {!isLoading && entries.length > 0 && (
          <div className="flex justify-between text-sm font-bold pt-1">
            <span>Closing Balance (owed)</span>
            <span className={closingBalance > 0 ? 'text-destructive' : 'text-green-600'}>
              ৳{closingBalance.toFixed(2)}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
