'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { updateSale } from '@/lib/actions';
import type { Customer, Item, Sale } from '@/lib/types';
import { saleFormSchema, type SaleFormValues } from './schema';
import { SalePaymentToggle } from './sale-payment-toggle';
import { SaleItemsTable } from './sale-items-table';
import { SalePaymentSection } from './sale-payment-section';
import { SaleSummaryCard } from './sale-summary-card';

interface EditSaleDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  items: Item[];
  customers: Customer[];
  onSuccess: () => void;
}

export function EditSaleDialog({
  userId,
  isOpen,
  onOpenChange,
  sale,
  items,
  customers,
  onSuccess,
}: EditSaleDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: '',
      date: new Date(),
      items: [],
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
      extraSales: 0,
      total: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  React.useEffect(() => {
    if (isOpen && sale) {
      form.reset({
        customerId: sale.customerId || '',
        date: sale.date ? new Date(sale.date) : new Date(),
        items: (sale.items || []).map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          price: item.price,
        })),
        discountType: sale.discountType || 'none',
        discountValue: sale.discountValue || 0,
        paymentMethod: sale.paymentMethod || 'Cash',
        amountPaid: sale.amountPaid || 0,
        splitPaymentMethod: sale.splitPaymentMethod || 'Cash',
        creditApplied: sale.creditApplied || 0,
        extraSales: sale.extraSales || 0,
        total: sale.total || 0,
      });
    }
  }, [isOpen, sale, form]);

  const watchItems = useWatch({ control: form.control, name: 'items' }) || [];

  const subtotal = React.useMemo(() => {
    return watchItems.reduce((acc: number, item: any) => {
      if (!item?.itemId) return acc;
      return acc + (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
    }, 0);
  }, [watchItems]);

  const handleAddNewRow = () => append({ itemId: '', quantity: 1, price: 0 });

  const onSubmit = (data: SaleFormValues) => {
    if (!sale) return;
    const activeItems = data.items.filter((item) => item.itemId !== '');

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
          customerId: data.customerId || sale.customerId || '',
          items: activeItems as any,
          date: data.date.toISOString(),
          discountType: data.discountType || 'none',
          discountValue: data.discountValue || 0,
        };

        const result = await updateSale(userId, sale.id, saleData);

        if (result?.success) {
          toast({ title: 'Sale Updated', description: `Sale ${sale.saleId} has been updated.` });
          onSuccess();
          onOpenChange(false);
        } else {
          toast({ variant: 'destructive', title: 'Update Failed', description: result.error || 'Could not update sale.' });
        }
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
      }
    });
  };

  const sellableItems = React.useMemo(() => {
    return items.filter((item) => {
      const catName = (item.categoryName || '').toLowerCase();
      return catName !== 'assets' && catName !== 'surgicals';
    });
  }, [items]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Sale ({sale?.saleId})</DialogTitle>
          <DialogDescription>
            Update items, prices, quantities, date, or customer details for this recorded sale. Stock and balances will reconcile automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden space-y-4">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectPortal>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SalePaymentToggle />
              <Separator />

              <SaleItemsTable
                items={sellableItems}
                fields={fields}
                remove={remove}
                appendRow={handleAddNewRow}
              />

              <Separator />
              <SalePaymentSection />
              <SaleSummaryCard subtotal={subtotal} />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Updating...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
