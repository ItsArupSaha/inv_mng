'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface PurchaseItemMedicineFieldsProps {
  index: number;
  storeType: string;
}

export function PurchaseItemMedicineFields({ index, storeType }: PurchaseItemMedicineFieldsProps) {
  const { control } = useFormContext();

  return (
    <>
      <FormField
        control={control}
        name={`items.${index}.medicineGroup`}
        render={({ field }) => (
          <FormItem className={storeType === 'pharmacy' ? 'md:col-span-3' : 'md:col-span-2'}>
            <FormLabel className="text-xs">Group (Generic)</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Paracetamol" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`items.${index}.expiryDate`}
        render={({ field }) => (
          <FormItem className={storeType === 'pharmacy' ? 'md:col-span-3' : 'md:col-span-2'}>
            <FormLabel className="text-xs">Expiry Date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {storeType !== 'pharmacy' && (
        <FormField
          control={control}
          name={`items.${index}.location`}
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="text-xs">Shelf / Row</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Row A3" {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
