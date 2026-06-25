'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { Category, Purchase } from '@/lib/types';
import { useRecordPurchase } from '@/hooks/use-record-purchase';

import { PurchaseItemRow } from './purchase-item-row';
import { PurchasePaymentSection } from './purchase-payment-section';
import { PurchaseSummarySection } from './purchase-summary-section';

interface RecordPurchaseDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editingPurchase?: Purchase | null;
  onSuccess: () => void;
  onAddCategoryClick: () => void;
}

export function RecordPurchaseDialog({
  userId,
  isOpen,
  onOpenChange,
  categories,
  editingPurchase,
  onSuccess,
  onAddCategoryClick,
}: RecordPurchaseDialogProps) {
  const {
    form,
    fields,
    remove,
    isPending,
    storeType,
    onSubmit,
    handleAddItem,
  } = useRecordPurchase({
    userId,
    isOpen,
    onOpenChange,
    categories,
    editingPurchase,
    onSuccess,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{editingPurchase ? 'Edit Purchase Details' : 'Record New Purchase'}</DialogTitle>
          <DialogDescription>
            {editingPurchase 
              ? 'Update the purchase details. Stock levels and financial transactions will reconcile automatically.'
              : (storeType === 'pharmacy' 
                  ? 'Enter company details and the items purchased. New items will be created automatically.' 
                  : 'Enter supplier details and the items purchased. New items will be created automatically.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1 py-4">
              <div className="space-y-4 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{storeType === 'pharmacy' ? 'Company Name' : 'Supplier Name'}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={storeType === 'pharmacy' ? 'e.g., Square Pharmaceuticals' : 'e.g., Global Publishing House'} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {storeType === 'pharmacy' && (
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shelf / Row</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 2, Shelf-A, Row-3" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <Separator />
                
                <FormLabel>Items</FormLabel>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <PurchaseItemRow
                      key={field.id}
                      index={index}
                      categories={categories}
                      onAddCategoryClick={onAddCategoryClick}
                      onRemove={() => remove(index)}
                      disabledRemove={fields.length === 1}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                
                <Separator />
                <PurchasePaymentSection />
              </div>
            </div>
            
            <div className="mt-auto pt-4 space-y-4 border-t px-6 pb-6 bg-background">
              <PurchaseSummarySection />
              <DialogFooter>
                <Button type="submit" disabled={isPending || !form.formState.isValid}>
                  {isPending ? "Saving..." : editingPurchase ? "Update Purchase" : "Confirm Purchase"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

