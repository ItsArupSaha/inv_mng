'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanyCapitalAdjustmentProps {
  form: UseFormReturn<any>;
  isLoadingCapital: boolean;
  balances: { cash: number; bank: number } | null;
}

export function CompanyCapitalAdjustment({
  form,
  isLoadingCapital,
  balances,
}: CompanyCapitalAdjustmentProps) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="text-lg font-semibold">Capital Adjustment</h3>
      <p className="text-sm text-muted-foreground">
        To adjust capital, enter a positive number to add or a negative number to subtract. This only
        affects the capital contribution, not current balances.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoadingCapital ? (
          <div className="space-y-2">
            <FormLabel>Current Cash Balance</FormLabel>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <FormLabel>Current Cash Balance</FormLabel>
            <Input value={`৳${balances?.cash.toFixed(2) || '0.00'}`} readOnly disabled />
          </div>
        )}
        <FormField
          control={form.control}
          name="cashAdjustment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adjust Cash Capital By</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoadingCapital ? (
          <div className="space-y-2">
            <FormLabel>Current Bank Balance</FormLabel>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <FormLabel>Current Bank Balance</FormLabel>
            <Input value={`৳${balances?.bank.toFixed(2) || '0.00'}`} readOnly disabled />
          </div>
        )}
        <FormField
          control={form.control}
          name="bankAdjustment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adjust Bank Capital By</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
