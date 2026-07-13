'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface GeneralFormFieldsProps {
  form: UseFormReturn<any>;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
}

export function GeneralFormFields({
  form,
  showAdvanced,
  setShowAdvanced,
}: GeneralFormFieldsProps) {
  return (
    <div className="space-y-4 pt-2">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <span className="text-xs font-semibold">
          {showAdvanced ? 'Hide Additional Details' : 'Show Additional Details (Brand, Expiry, Location)'}
        </span>
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {showAdvanced && (
        <div className="space-y-4 border p-4 rounded-lg bg-muted/20 animate-in fade-in-50 duration-200">
          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand / Author</FormLabel>
                <FormControl>
                  <Input placeholder="Brand name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturer / Supplier</FormLabel>
                <FormControl>
                  <Input placeholder="Manufacturer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="medicineGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specification Group / Group (Generic)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Electronic, Organic, Tablets" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date (If applicable)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Shelf B, Row 4" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
