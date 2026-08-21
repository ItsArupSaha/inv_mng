'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PharmacyFormFieldsProps {
  form: UseFormReturn<any>;
}

export function PharmacyFormFields({ form }: PharmacyFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="medicineGroup"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group (Generic)</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Paracetamol, Omeprazole" {...field} />
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
            <FormLabel>Pharmaceutical Company / Manufacturer</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Square, Beximco" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiry Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="schedule"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drug Schedule</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'none'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Ordinary (no schedule)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Ordinary (no schedule)</SelectItem>
                  <SelectItem value="narcotic">Narcotic</SelectItem>
                  <SelectItem value="controlled">Controlled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
