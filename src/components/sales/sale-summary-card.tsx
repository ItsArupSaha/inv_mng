'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface SaleSummaryCardProps {
  subtotal: number;
}

export function SaleSummaryCard({ subtotal }: SaleSummaryCardProps) {
  const { control, setValue, watch } = useFormContext();
  const [isTotalEdited, setIsTotalEdited] = React.useState(false);
  const totalValue = watch('total');

  // Auto-update final total in form when subtotal changes, unless manually overridden
  React.useEffect(() => {
    if (!isTotalEdited) {
      setValue('total', subtotal);
    }
  }, [subtotal, setValue, isTotalEdited]);

  // Reset override state when subtotal and total value both become zero (e.g. on form reset)
  React.useEffect(() => {
    if (subtotal === 0 && (Number(totalValue) === 0 || !totalValue)) {
      setIsTotalEdited(false);
    }
  }, [subtotal, totalValue]);

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
                      className="w-28 text-right h-8 font-bold font-mono tabular-nums bg-background border rounded-md"
                      {...totalField}
                      onChange={(e) => {
                        setIsTotalEdited(true);
                        totalField.onChange(Number(e.target.value) || '');
                      }}
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
