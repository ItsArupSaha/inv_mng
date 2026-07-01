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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addCapitalAdjustment } from '@/lib/actions';

const addCapitalSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least BDT 1.'),
  paymentMethod: z.enum(['Cash', 'Bank']),
  notes: z.string().optional(),
  date: z.date(),
});

type AddCapitalFormValues = z.infer<typeof addCapitalSchema>;

interface AddCapitalDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCapitalDialog({
  userId,
  isOpen,
  onOpenChange,
  onSuccess,
}: AddCapitalDialogProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm<AddCapitalFormValues>({
    resolver: zodResolver(addCapitalSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: 'Cash',
      notes: '',
      date: new Date(),
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        amount: 0,
        paymentMethod: 'Cash',
        notes: '',
        date: new Date(),
      });
    }
  }, [isOpen, form]);

  const onSubmit = async (values: AddCapitalFormValues) => {
    setIsPending(true);
    try {
      await addCapitalAdjustment(userId, {
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
        date: values.date,
      });

      toast({
        title: 'Capital Added Successfully!',
        description: `Successfully added BDT ${values.amount.toLocaleString()} to your ${values.paymentMethod} account.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to add capital',
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
          <DialogTitle className="font-headline text-xl">Add Business Capital</DialogTitle>
          <DialogDescription>
            Inject more funds into your business capital. This will be added to your current Cash or Bank balance.
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
                    <Input type="number" step="any" placeholder="Enter capital amount" {...field} />
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
                  <FormLabel>Destination Account</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                  <FormLabel>Transaction Date</FormLabel>
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
                      placeholder="e.g., Personal cash investment, Business loan injection, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Confirm Add Capital'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
