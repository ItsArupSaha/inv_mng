'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import type { AuthUser } from '@/lib/types';
import { useEditCompanyDetails } from '@/hooks/use-edit-company-details';

interface EditCompanyDetailsDialogProps {
  user: AuthUser;
  children: React.ReactNode;
}

export function EditCompanyDetailsDialog({ user, children }: EditCompanyDetailsDialogProps) {
  const {
    isOpen,
    setIsOpen,
    isSubmitting,
    balances,
    isLoadingCapital,
    form,
    onSubmit
  } = useEditCompanyDetails({ user });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Store Details</DialogTitle>
          <DialogDescription>
            Update the information for your store. This will be reflected in reports and memos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 py-1">
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
                    <FormDescription>
                      A short, descriptive tagline for your store.
                    </FormDescription>
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

              <Separator />

              <div className="space-y-4 rounded-md border p-4">
                <h3 className="text-lg font-semibold">Capital Adjustment</h3>
                <p className="text-sm text-muted-foreground">
                  To adjust capital, enter a positive number to add or a negative number to subtract. This only affects the capital contribution, not current balances.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoadingCapital ? (
                    <Skeleton className="h-10 w-full" />
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
                    <Skeleton className="h-10 w-full" />
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

            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="submit" disabled={isSubmitting || isLoadingCapital}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
