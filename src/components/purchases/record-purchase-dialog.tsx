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
    existingItems,
  } = useRecordPurchase({
    userId,
    isOpen,
    onOpenChange,
    categories,
    editingPurchase,
    onSuccess,
  });

  const existingCompanies = React.useMemo(() => {
    if (!existingItems) return [];
    const set = new Set<string>();
    existingItems.forEach(item => {
      if (item.company && item.company.trim()) {
        set.add(item.company.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [existingItems]);

  const supplierName = form.watch('supplier') || '';
  const [showCompanySuggestions, setShowCompanySuggestions] = React.useState(false);

  const companySuggestions = React.useMemo(() => {
    if (!supplierName) return [];
    const query = supplierName.trim().toLowerCase();
    if (!query) return [];
    return existingCompanies.filter(comp => 
      comp.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [supplierName, existingCompanies]);

  const onError = (errors: any) => {
    console.log("Purchase Form Validation Errors:", errors);
  };

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
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex-1 flex flex-col overflow-hidden">
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
                          <div className="relative">
                            <Input 
                              placeholder={storeType === 'pharmacy' ? 'e.g., Square Pharmaceuticals' : 'e.g., Global Publishing House'} 
                              {...field} 
                              onFocus={() => setShowCompanySuggestions(true)}
                              onBlur={() => setShowCompanySuggestions(false)}
                              autoComplete="off"
                            />
                            {showCompanySuggestions && companySuggestions.length > 0 && (
                              <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-popover text-popover-foreground border rounded-md shadow-lg p-1">
                                {companySuggestions.map((company) => (
                                  <button
                                    key={company}
                                    type="button"
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted text-foreground font-medium"
                                    onMouseDown={() => {
                                      form.setValue('supplier', company, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                                      setShowCompanySuggestions(false);
                                    }}
                                  >
                                    {company}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
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
                      existingItems={existingItems}
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
                <Button type="submit" disabled={isPending}>
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

