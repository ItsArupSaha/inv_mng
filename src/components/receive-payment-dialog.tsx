'use client';

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useReceivePayment } from '@/hooks/use-receive-payment';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ReceivePaymentDialogProps {
  customerId?: string;
  userId: string;
  onPaymentReceived: () => void;
  children: React.ReactNode;
}

export default function ReceivePaymentDialog({ customerId, userId, children, onPaymentReceived }: ReceivePaymentDialogProps) {
  const {
    isOpen,
    setIsOpen,
    isPending,
    customersWithDue,
    isLoadingCustomers,
    form,
    onSubmit,
  } = useReceivePayment({
    customerId,
    userId,
    onPaymentReceived,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Due Payment</DialogTitle>
          <DialogDescription>
            Record a payment received from a customer for their outstanding balance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {!customerId && (
               <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          {isLoadingCustomers ? (
                            <span className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading customers...</span>
                          ) : (
                            <SelectValue placeholder="Select a customer" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customersWithDue.length > 0 ? customersWithDue.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} - (Due: ৳{c.dueBalance.toFixed(2)})
                          </SelectItem>
                        )) : (
                           <p className="p-4 text-sm text-muted-foreground">No customers with due balance found.</p>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Received</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="Cash" /></FormControl>
                        <FormLabel className="font-normal">Cash</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="Bank" /></FormControl>
                        <FormLabel className="font-normal">Bank</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending || isLoadingCustomers}>
                {isPending ? 'Saving...' : 'Save Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    