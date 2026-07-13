'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { addCapitalAdjustment, updateCapitalAdjustment } from '@/lib/actions';
import type { Capital } from '@/lib/types';
import { CapitalFormFields } from './capital-form-fields';

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
  editingCapital?: Capital | null;
}

export function AddCapitalDialog({
  userId,
  isOpen,
  onOpenChange,
  onSuccess,
  editingCapital = null,
}: AddCapitalDialogProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm<AddCapitalFormValues>({
    resolver: zodResolver(addCapitalSchema),
    defaultValues: { amount: 0, paymentMethod: 'Cash', notes: '', date: new Date() },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (editingCapital) {
        form.reset({
          amount: editingCapital.amount,
          paymentMethod: editingCapital.paymentMethod === 'Asset' ? 'Cash' : (editingCapital.paymentMethod as 'Cash' | 'Bank'),
          notes: editingCapital.notes || '',
          date: new Date(editingCapital.date),
        });
      } else {
        form.reset({ amount: 0, paymentMethod: 'Cash', notes: '', date: new Date() });
      }
    }
  }, [isOpen, editingCapital, form]);

  const onSubmit = async (values: AddCapitalFormValues) => {
    setIsPending(true);
    try {
      if (editingCapital) {
        await updateCapitalAdjustment(userId, editingCapital.id, {
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          notes: values.notes,
          date: values.date,
        });
        toast({
          title: 'Capital Updated Successfully!',
          description: `Updated capital record to BDT ${values.amount.toLocaleString()} in your ${values.paymentMethod} account.`,
        });
      } else {
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
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: editingCapital ? 'Failed to update capital' : 'Failed to add capital',
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
            {editingCapital ? 'Edit Capital Entry' : 'Add Business Capital'}
          </DialogTitle>
          <DialogDescription>
            {editingCapital
              ? 'Update the details for this capital contribution record.'
              : 'Inject more funds into your business capital. This will be added to your current Cash or Bank balance.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CapitalFormFields form={form} />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : editingCapital ? (
                  'Save Changes'
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
