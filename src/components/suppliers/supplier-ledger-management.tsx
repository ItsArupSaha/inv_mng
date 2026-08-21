'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getSupplierSummaries } from '@/lib/actions';
import type { SupplierSummary } from '@/lib/supplier-ledger';
import { SupplierLedgerDialog } from './supplier-ledger-dialog';

interface SupplierLedgerManagementProps {
  userId: string;
}

export default function SupplierLedgerManagement({ userId }: SupplierLedgerManagementProps) {
  const { toast } = useToast();
  const [summaries, setSummaries] = React.useState<SupplierSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeSupplier, setActiveSupplier] = React.useState<string | null>(null);

  const loadSummaries = React.useCallback(async () => {
    if (!userId) return;
    try {
      setSummaries(await getSupplierSummaries(userId));
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load supplier ledgers.' });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  const totalOutstanding = summaries.reduce((sum, s) => sum + s.outstanding, 0);
  const totalPurchased = summaries.reduce((sum, s) => sum + s.totalPurchased, 0);

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Supplier Ledger</CardTitle>
        <CardDescription>
          Every supplier you buy from: how much you bought, paid, returned, and still owe.
        </CardDescription>
        {!isLoading && summaries.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm pt-2">
            <span className="text-muted-foreground">
              Suppliers: <span className="font-semibold text-foreground">{summaries.length}</span>
            </span>
            <span className="text-muted-foreground">
              Total bought: <span className="font-semibold text-foreground">৳{totalPurchased.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              Total due: <span className="font-semibold text-destructive">৳{totalOutstanding.toFixed(2)}</span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Purchases</TableHead>
                <TableHead className="text-right">Total Bought</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="hidden sm:table-cell">Last Purchase</TableHead>
                <TableHead className="text-right w-[70px]">Ledger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-3/4" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : summaries.length > 0 ? summaries.map(summary => (
                <TableRow key={summary.supplier}>
                  <TableCell className="font-medium max-w-[180px] truncate" title={summary.supplier}>
                    {summary.supplier}
                  </TableCell>
                  <TableCell className="text-center">{summary.purchaseCount}</TableCell>
                  <TableCell className="text-right">৳{summary.totalPurchased.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {summary.totalReturned > 0 ? `৳${summary.totalReturned.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">৳{summary.totalPaid.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${summary.outstanding > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {summary.outstanding > 0 ? `৳${summary.outstanding.toFixed(2)}` : 'Clear'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {summary.lastPurchaseDate ? format(new Date(summary.lastPurchaseDate), 'dd MMM yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setActiveSupplier(summary.supplier)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No suppliers yet — record a purchase first.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <SupplierLedgerDialog
        userId={userId}
        supplier={activeSupplier}
        onOpenChange={(open) => !open && setActiveSupplier(null)}
      />
    </Card>
  );
}
