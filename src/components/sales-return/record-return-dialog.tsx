'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
import type { Customer, Item } from '@/lib/types';
import { salesReturnFormSchema, type SalesReturnFormValues } from './schema';
import { ReturnItemsList } from './return-items-list';

interface RecordReturnDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  customers: Customer[];
  isPending: boolean;
  onSubmit: (data: SalesReturnFormValues) => void;
}

export function RecordReturnDialog({
  isOpen,
  onOpenChange,
  items,
  customers,
  isPending,
  onSubmit,
}: RecordReturnDialogProps) {
  const form = useForm<SalesReturnFormValues>({
    resolver: zodResolver(salesReturnFormSchema),
    defaultValues: {
      customerId: '',
      items: [{ itemId: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  const totalReturnValue = watchItems.reduce((acc, item) => {
    const price = item.price || 0;
    const quantity = Number(item.quantity) || 0;
    return acc + price * quantity;
  }, 0);

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        customerId: '',
        items: [{ itemId: '', quantity: 1, price: 0 }],
      });
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: SalesReturnFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Record a Sales Return</DialogTitle>
          <DialogDescription>
            Select the customer and items being returned. The value will be credited to their account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectPortal>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
              <ReturnItemsList
                form={form}
                fields={fields}
                items={items}
                watchItems={watchItems}
                remove={remove}
                append={append}
              />
              <Separator />
              <div className="flex justify-between font-bold text-base pr-4">
                <span>Total Return Credit</span>
                <span>৳{totalReturnValue.toFixed(2)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || totalReturnValue <= 0 || !form.formState.isValid}>
                {isPending ? 'Recording...' : 'Record Return'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
