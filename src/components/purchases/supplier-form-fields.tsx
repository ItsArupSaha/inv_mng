'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Item } from '@/lib/types';

interface SupplierFormFieldsProps {
  form: UseFormReturn<any>;
  existingItems: Item[];
  storeType: string;
}

export function SupplierFormFields({ form, existingItems, storeType }: SupplierFormFieldsProps) {
  const existingCompanies = React.useMemo(() => {
    if (!existingItems) return [];
    const set = new Set<string>();
    existingItems.forEach((item) => {
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
    return existingCompanies.filter((comp) => comp.toLowerCase().includes(query)).slice(0, 5);
  }, [supplierName, existingCompanies]);

  return (
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
                  placeholder={
                    storeType === 'pharmacy'
                      ? 'e.g., Square Pharmaceuticals'
                      : 'e.g., Global Publishing House'
                  }
                  {...field}
                  onFocus={() => setShowCompanySuggestions(true)}
                  onBlur={() => {
                    // Slight delay to allow clicks on suggestion buttons
                    setTimeout(() => setShowCompanySuggestions(false), 200);
                  }}
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
                          form.setValue('supplier', company, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
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
                <Input placeholder="e.g., 2, Shelf-A, Row-3" {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
