'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function SaleSummaryCard() {
  const { control, watch, setValue } = useFormContext();
  const watchItems = watch('items') || [];

  // Calculate Subtotal dynamically from all non-empty rows
  const subtotal = React.useMemo(() => {
    return watchItems.reduce((acc: number, item: any) => {
      if (!item?.itemId) return acc;
      const price = Number(item?.price) || 0;
      const quantity = Number(item?.quantity) || 0;
      return acc + (price * quantity);
    }, 0);
  }, [watchItems]);

  // Auto-update final total in form when subtotal changes
  React.useEffect(() => {
    setValue('total', subtotal);
  }, [subtotal, setValue]);

  return (
    <div className="flex flex-col sm:flex-row justify-end">
      <div className="w-full sm:w-80 bg-muted/30 border rounded-lg p-4 space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Computed Subtotal:</span>
          <span className="font-semibold font-mono">৳{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t font-bold text-base">
          <span>Final Total:</span>
          <div className="flex items-center gap-1">
            <span>৳</span>
            <FormField
              control={control}
              name="total"
              render={({ field: totalField }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28 text-right h-8 font-bold font-mono tabular-nums"
                      {...totalField}
                      onChange={(e) => totalField.onChange(Number(e.target.value) || '')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
