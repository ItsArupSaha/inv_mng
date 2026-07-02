'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addSecurityDeposit, updateSecurityDeposit } from '@/lib/actions';
import type { SecurityDeposit } from '@/lib/types';

const securityDepositSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least BDT 1.'),
  paymentMethod: z.enum(['Cash', 'Bank']),
  notes: z.string().optional(),
  date: z.date(),
  status: z.enum(['Refundable', 'Refunded']),
  refundDate: z.date().optional(),
  refundPaymentMethod: z.enum(['Cash', 'Bank']).optional(),
});

type SecurityDepositFormValues = z.infer<typeof securityDepositSchema>;

interface AddSecurityDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingSecurity?: SecurityDeposit | null;
}

export function AddSecurityDialog({
  userId,
  isOpen,
  onOpenChange,
  onSuccess,
  editingSecurity = null,
}: AddSecurityDialogProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm<SecurityDepositFormValues>({
    resolver: zodResolver(securityDepositSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: 'Cash',
      notes: '',
      date: new Date(),
      status: 'Refundable',
      refundDate: new Date(),
      refundPaymentMethod: 'Cash',
    },
  });

  const watchStatus = form.watch('status');

  // Reset form when dialog opens or editing record changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingSecurity) {
        form.reset({
          amount: editingSecurity.amount,
          paymentMethod: editingSecurity.paymentMethod,
          notes: editingSecurity.notes || '',
          date: new Date(editingSecurity.date),
          status: editingSecurity.status,
          refundDate: editingSecurity.refundDate ? new Date(editingSecurity.refundDate) : new Date(),
          refundPaymentMethod: editingSecurity.refundPaymentMethod || 'Cash',
        });
      } else {
        form.reset({
          amount: 0,
          paymentMethod: 'Cash',
          notes: '',
          date: new Date(),
          status: 'Refundable',
          refundDate: new Date(),
          refundPaymentMethod: 'Cash',
        });
      }
    }
  }, [isOpen, editingSecurity, form]);

  const onSubmit = async (values: SecurityDepositFormValues) => {
    setIsPending(true);
    try {
      if (editingSecurity) {
        // Edit mode
        await updateSecurityDeposit(userId, editingSecurity.id, {
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          notes: values.notes,
          date: values.date,
          status: values.status,
          refundDate: values.status === 'Refunded' ? values.refundDate : undefined,
          refundPaymentMethod: values.status === 'Refunded' ? values.refundPaymentMethod : undefined,
        });

        toast({
          title: 'Security Deposit Updated!',
          description: `Updated security deposit record of BDT ${values.amount.toLocaleString()}.`,
        });
      } else {
        // Add mode
        await addSecurityDeposit(userId, {
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          notes: values.notes,
          date: values.date,
        });

        toast({
          title: 'Security Deposit Added!',
          description: `Successfully paid BDT ${values.amount.toLocaleString()} from your ${values.paymentMethod} account.`,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: editingSecurity ? 'Failed to update security deposit' : 'Failed to add security deposit',
        description: 'An error occurred while saving the transaction. Please try again.',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">
            {editingSecurity ? 'Edit Security Deposit' : 'Add Security Deposit'}
          </DialogTitle>
          <DialogDescription>
            {editingSecurity
              ? 'Update details or process a refund for this security deposit.'
              : 'Record a refundable security deposit paid for renting a room/asset. This will decrease your Cash/Bank balance.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (BDT)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="Enter amount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Source Account (Paid From)</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Cash" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">Cash Balance</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Bank" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">Bank Balance</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Security deposit for pharmacy room rent, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Refund fields (only in edit mode) */}
            {editingSecurity && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm text-primary">Refund Status</h4>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Refundable">Active / Refundable</SelectItem>
                          <SelectItem value="Refunded">Refunded (Settled)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchStatus === 'Refunded' && (
                  <>
                    <FormField
                      control={form.control}
                      name="refundPaymentMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Destination Account (Refunded To)</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Cash" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">Cash Balance</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Bank" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">Bank Balance</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="refundDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Refund Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingSecurity ? 'Save Changes' : 'Confirm Security Deposit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
