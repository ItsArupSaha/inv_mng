'use client';

import * as React from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { addPurchaseReturn, getPurchaseReturns } from '@/lib/actions';
import { computeRefundTotal, remainingReturnableQuantities } from '@/lib/purchase-return-math';
import type { Purchase } from '@/lib/types';

interface PurchaseReturnDialogProps {
  userId: string;
  purchase: Purchase | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type RefundMethod = 'Cash' | 'Bank' | 'Due';

export function PurchaseReturnDialog({ userId, purchase, onOpenChange, onSuccess }: PurchaseReturnDialogProps) {
  const { toast } = useToast();
  const [remaining, setRemaining] = React.useState<number[]>([]);
  const [quantities, setQuantities] = React.useState<Record<number, string>>({});
  const [refundMethod, setRefundMethod] = React.useState<RefundMethod>('Due');
  const [isSubmitting, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!purchase) return;
    setQuantities({});
    setRefundMethod('Due');
    getPurchaseReturns(userId)
      .then(returns => setRemaining(
        remainingReturnableQuantities(
          purchase.items,
          returns.filter(r => r.purchaseDocId === purchase.id)
        )
      ))
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to load return history.' }));
  }, [userId, purchase, toast]);

  const lines = React.useMemo(() => {
    if (!purchase) return [];
    return purchase.items
      .map((item, lineIndex) => ({ item, lineIndex }))
      .filter(({ lineIndex }) => (remaining[lineIndex] ?? 0) > 0)
      .map(({ item, lineIndex }) => ({
        lineIndex,
        quantity: Math.min(Number(quantities[lineIndex]) || 0, remaining[lineIndex] ?? 0),
        cost: item.cost,
      }))
      .filter(line => line.quantity > 0);
  }, [purchase, quantities, remaining]);

  const refundTotal = computeRefundTotal(lines);

  const handleSubmit = () => {
    if (!purchase || lines.length === 0) return;
    startTransition(async () => {
      const result = await addPurchaseReturn(userId, {
        purchaseDocId: purchase.id,
        lines,
        refundMethod,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        toast({ variant: 'destructive', title: 'Return failed', description: result.error });
      }
    });
  };

  const returnableRows = purchase
    ? purchase.items.map((item, lineIndex) => ({ item, lineIndex })).filter(({ lineIndex }) => (remaining[lineIndex] ?? 0) > 0)
    : [];

  return (
    <Dialog open={!!purchase} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Return items to supplier</DialogTitle>
          <DialogDescription>
            {purchase ? `${purchase.purchaseId} — ${purchase.supplier}. Stock leaves your store; refund comes back as cash/bank or is adjusted against due.` : ''}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[45vh]">
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Bought</TableHead>
                  <TableHead className="text-right">Already Returned</TableHead>
                  <TableHead className="text-right">Can Return</TableHead>
                  <TableHead className="text-right w-[90px]">Return Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnableRows.length > 0 ? returnableRows.map(({ item, lineIndex }) => {
                  const bought = item.quantity;
                  const alreadyReturned = bought - (remaining[lineIndex] ?? 0);
                  const max = remaining[lineIndex] ?? 0;
                  return (
                    <TableRow key={lineIndex}>
                      <TableCell className="max-w-[180px] truncate" title={item.itemName}>
                        {item.itemName}
                        {item.expiryDate && <span className="block text-xs text-muted-foreground">Exp: {item.expiryDate}</span>}
                      </TableCell>
                      <TableCell className="text-right">{bought}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{alreadyReturned}</TableCell>
                      <TableCell className="text-right font-medium">{max}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={max}
                          value={quantities[lineIndex] ?? ''}
                          onChange={e => setQuantities(prev => ({ ...prev, [lineIndex]: e.target.value }))}
                          className="h-8 w-[80px] text-right"
                        />
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nothing left to return from this purchase.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        <div className="space-y-2">
          <Label>Refund method</Label>
          <RadioGroup
            value={refundMethod}
            onValueChange={value => setRefundMethod(value as RefundMethod)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Due" id="refund-due" />
              <Label htmlFor="refund-due">Adjust with supplier due</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Cash" id="refund-cash" />
              <Label htmlFor="refund-cash">Cash refund</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Bank" id="refund-bank" />
              <Label htmlFor="refund-bank">Bank refund</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-between font-bold">
          <span>Total Refund</span>
          <span>৳{refundTotal.toFixed(2)}</span>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || lines.length === 0 || refundTotal <= 0}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Returning...' : 'Confirm Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
