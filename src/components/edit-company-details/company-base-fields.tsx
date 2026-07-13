'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuthUser } from '@/lib/types';

interface CompanyBaseFieldsProps {
  form: UseFormReturn<any>;
  user: AuthUser;
}

export function CompanyBaseFields({ form, user }: CompanyBaseFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store / Company Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., MediCare Pharmacy, General Mart" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="storeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">General Shop / Inventory</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy / Medical Shop</SelectItem>
                  <SelectItem value="bookstore">Book Store</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="subtitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sub-title / Tagline (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Your neighborhood pharmacy" {...field} />
            </FormControl>
            <FormDescription>A short, descriptive tagline for your store.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Phone</FormLabel>
              <FormControl>
                <Input placeholder="Your primary contact number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bkashNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bkash Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Your Bkash account number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Store Address</FormLabel>
            <FormControl>
              <Textarea placeholder="123 Bookworm Lane, Readsville, USA" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bankInfo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Bank Details (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="e.g., Bank Name, Account Number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!user.secretKey && (
        <FormField
          control={form.control}
          name="secretKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Secret Key (Set Once)</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your secret key" {...field} />
              </FormControl>
              <FormDescription>
                This key is for future integrations and can only be set once. It cannot be changed later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
