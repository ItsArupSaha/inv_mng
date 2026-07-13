'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { addSecurityDeposit, updateSecurityDeposit } from '@/lib/actions';
import type { SecurityDeposit } from '@/lib/types';
import { SecurityDepositFormFields } from './security-deposit-form-fields';

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <SecurityDepositFormFields form={form} editingSecurity={!!editingSecurity} />

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
                ) : editingSecurity ? (
                  'Save Changes'
                ) : (
                  'Confirm Security Deposit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
