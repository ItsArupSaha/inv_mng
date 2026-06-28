'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
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

  const initialRows = Array.from({ length: 10 }).map(() => ({ itemId: '', quantity: 1, price: 0 }));

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      items: initialRows,
      date: new Date(),
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
      total: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Find Walk-in Customer
  const walkInCustomer = React.useMemo(() => {
    return customers.find(c => c.name === 'Walk-in Customer') || customers[0];
  }, [customers]);

  const watchItems = useWatch({
    control: form.control,
    name: 'items',
  }) || [];
  const subtotal = React.useMemo(() => {
    return watchItems.reduce((acc: number, item: any) => {
      if (!item?.itemId) return acc;
      const price = Number(item?.price) || 0;
      const quantity = Number(item?.quantity) || 0;
      return acc + (price * quantity);
    }, 0);
  }, [watchItems]);

  const handleAddNewRow = () => {
    append({ itemId: '', quantity: 1, price: 0 });
  };

  const handleResetForm = () => {
    form.reset({
      items: Array.from({ length: 10 }).map(() => ({ itemId: '', quantity: 1, price: 0 })),
      date: new Date(),
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
      total: 0,
    });
    setCompletedSale(null);
  };

  const onSubmit = (data: SaleFormValues) => {
    // Filter out rows without selected items
    const activeItems = data.items.filter(item => item.itemId !== '');

    if (activeItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select at least one item to sell.',
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
        };

        const result = await addSale(userId, saleData);

        if (result?.success && result.sale) {
          toast({ title: 'Sale Recorded', description: 'The new sale has been successfully saved.' });
          setCompletedSale(result.sale);
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

  return (
    <div className="space-y-6 w-full max-w-none">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <SalePaymentToggle />
          
          <SaleItemsTable 
            items={items} 
            fields={fields} 
            remove={remove} 
            appendRow={handleAddNewRow} 
          />

          <SaleSummaryCard subtotal={subtotal} />

          {/* Form Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleResetForm} disabled={isPending}>
              Reset Form
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Confirming...' : 'Confirm Sale & Print'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Sale Memo Dialog popup on completion */}
      <Dialog open={!!completedSale} onOpenChange={(open) => !open && handleResetForm()}>
        <DialogContent className="sm:max-w-2xl">
          {completedSale && authUser && (
            <SaleMemo
              sale={completedSale}
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
