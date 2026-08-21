'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Printer } from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addSale } from '@/lib/actions';
import type { Customer, Item, Sale } from '@/lib/types';
import { SaleMemo } from '../sale-memo';
import { saleFormSchema, type SaleFormValues } from './schema';
import { SalePaymentToggle } from './sale-payment-toggle';
import { SaleItemsTable } from './sale-items-table';
import { SaleSummaryCard } from './sale-summary-card';

interface RecordSaleFormProps {
  userId: string;
  items: Item[];
  customers: Customer[];
  onSuccess: () => void;
  authUser: any;
}

const DEFAULT_ROWS = Array.from({ length: 7 }).map(() => ({ itemId: '', quantity: 1, price: 0 }));

const getDefaultValues = () => ({
  items: DEFAULT_ROWS,
  date: new Date(),
  discountType: 'none' as const,
  discountValue: 0,
  paymentMethod: 'Cash' as const,
  amountPaid: 0,
  splitPaymentMethod: 'Cash' as const,
  creditApplied: 0,
  extraSales: 0,
  prescriptionRef: '',
  total: 0,
});

export function RecordSaleForm({
  userId,
  items,
  customers,
  onSuccess,
  authUser,
}: RecordSaleFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [completedSale, setCompletedSale] = React.useState<Sale | null>(null);
  const [lastSale, setLastSale] = React.useState<Sale | null>(null);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: getDefaultValues() as any,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const walkInCustomer = React.useMemo(() => {
    return customers.find((c) => c.name === 'Walk-in Customer') || customers[0];
  }, [customers]);

  const watchItems = useWatch({ control: form.control, name: 'items' }) || [];

  const subtotal = React.useMemo(() => {
    return watchItems.reduce((acc: number, item: any) => {
      if (!item?.itemId) return acc;
      return acc + (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
    }, 0);
  }, [watchItems]);

  // Narcotics/controlled register compliance: any scheduled medicine in the
  // cart makes a prescription reference mandatory before the sale can commit.
  const scheduledItems = React.useMemo(() => {
    const selected = new Set(
      watchItems.filter((item: any) => item?.itemId).map((item: any) => item.itemId as string)
    );
    return items.filter((item) => selected.has(item.id) && item.schedule);
  }, [watchItems, items]);
  const hasScheduledItems = scheduledItems.length > 0;

  const focusFirstSearch = React.useCallback(() => {
    requestAnimationFrame(() => {
      const firstInput = document.querySelector<HTMLInputElement>('[data-row="0"][data-col="0"]');
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    });
  }, []);

  React.useEffect(() => {
    focusFirstSearch();
  }, [focusFirstSearch]);

  const handleAddNewRow = () => append({ itemId: '', quantity: 1, price: 0 });

  const handleResetForm = () => {
    form.reset(getDefaultValues() as any);
    setCompletedSale(null);
    focusFirstSearch();
  };

  const onSubmit = (data: SaleFormValues) => {
    const activeItems = data.items.filter((item) => item.itemId !== '');

    if (activeItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select at least one item to sell.',
      });
      return;
    }

    if (hasScheduledItems && !data.prescriptionRef?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Prescription Required',
        description: `This sale contains scheduled medicines (${scheduledItems.map((i) => i.title).join(', ')}). Enter the prescription reference before confirming.`,
      });
      return;
    }

    startTransition(async () => {
      try {
        const saleData = {
          ...data,
          customerId: walkInCustomer?.id || '',
          items: activeItems as any,
          date: data.date.toISOString(),
          discountType: 'none' as const,
          discountValue: 0,
          prescriptionRef: data.prescriptionRef?.trim() || undefined,
        };

        const result = await addSale(userId, saleData);

        if (result?.success && result.sale) {
          setCompletedSale(result.sale);
          setLastSale(result.sale);
          onSuccess();
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
        }
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
      }
    });
  };

  const sellableItems = React.useMemo(() => {
    return items.filter((item) => item.isSalable !== false);
  }, [items]);

  const memoSale = completedSale || lastSale;

  return (
    <div className="space-y-6 w-full max-w-none">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <SalePaymentToggle />
          <SaleItemsTable
            items={sellableItems}
            fields={fields}
            remove={remove}
            appendRow={handleAddNewRow}
          />
          {hasScheduledItems && (
            <FormField
              control={form.control}
              name="prescriptionRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Prescription Reference (required — scheduled medicines:{' '}
                    {scheduledItems.map((i) => i.title).join(', ')})
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Rx #, doctor & date on prescription" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <SaleSummaryCard subtotal={subtotal} />
          <div className="flex justify-end gap-2 border-t pt-4">
            {lastSale && !completedSale && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCompletedSale(lastSale)}
              >
                <Printer className="mr-2 h-4 w-4" /> Reprint Last Memo
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleResetForm} disabled={isPending}>
              Reset Form
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Confirming...' : 'Confirm Sale & Print'}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={!!completedSale} onOpenChange={(open) => !open && handleResetForm()}>
        <DialogContent className="sm:max-w-2xl">
          {memoSale && authUser && (
            <SaleMemo
              sale={memoSale}
              customer={walkInCustomer}
              items={items}
              onNewSale={handleResetForm}
              user={authUser}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
