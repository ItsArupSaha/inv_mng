'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface BookstoreFormFieldsProps {
  form: UseFormReturn<any>;
}

export function BookstoreFormFields({ form }: BookstoreFormFieldsProps) {
  return (
    <FormField
      control={form.control}
      name="author"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Author</FormLabel>
          <FormControl>
            <Input placeholder="Author name" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
