'use client';

import { ShoppingCart } from 'lucide-react';
import * as React from 'react';
import { useFieldArray } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import type { Item, PackageTemplate } from '@/lib/types';
import { DownloadSaleMemo } from './download-sale-memo';
import { PackageSaleItemsSummary } from './packages/package-sale-items-summary';
import { PackagePaymentSection } from './packages/package-payment-section';
import { usePackageSale } from '@/hooks/use-package-sale';

interface PackageSaleDialogProps {
  packageTemplate: PackageTemplate;
  items: Item[];
  userId: string;
  onSaleComplete: () => void;
}

export function PackageSaleDialog({ packageTemplate, items, userId, onSaleComplete }: PackageSaleDialogProps) {
  const {
    isOpen,
    setIsOpen,
    customers,
    authUser,
    isPending,
    completedSale,
    form,
    watchItems,
    customerCredit,
    subtotal,
    totalAfterCredit,
    onSubmit,
    handleDialogClose
  } = usePackageSale({ packageTemplate, items, userId, onSaleComplete });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-2">
          <ShoppingCart className="h-4 w-4" /> Sell Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            Sell Package: {packageTemplate.name}
          </DialogTitle>
          <DialogDescription>
            The items and quantities are pre-loaded from the package template.
          </DialogDescription>
        </DialogHeader>

        {completedSale && authUser ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-600">Sale Completed!</h3>
            <p className="text-center text-muted-foreground">
              Package "{packageTemplate.name}" was successfully sold to {customers.find(c => c.id === completedSale.customerId)?.name || 'Customer'}.
            </p>
            <div className="pt-4 flex gap-4">
              <DownloadSaleMemo sale={completedSale} customer={customers.find(c => c.id === completedSale.customerId)!} items={items} user={authUser} />
              <Button onClick={() => setIsOpen(false)} variant="outline">Close Dialog</Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                
                <PackageSaleItemsSummary
                  control={form.control}
                  watchItems={watchItems}
                  fields={fields}
                  append={append}
                  remove={remove}
                  items={items}
                  subtotal={subtotal}
                />

                <PackagePaymentSection
                  customers={customers}
                  customerCredit={customerCredit}
                />
              </div>

              {/* Total Callout */}
              <div className="bg-primary/5 text-primary border border-primary/20 p-4 rounded-xl flex justify-between items-center shadow-inner mt-4">
                <div>
                    <p className="text-sm font-medium opacity-80">Final Total</p>
                    <p className="text-3xl font-bold tracking-tight">৳{totalAfterCredit.toFixed(2)}</p>
                </div>
                <Button type="submit" size="lg" className="font-semibold shadow-md" disabled={isPending}>
                  Confirm Sale
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

