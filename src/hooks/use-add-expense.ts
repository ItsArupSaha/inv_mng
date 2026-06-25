'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addExpense, updateExpense } from '@/lib/actions';
import type { Expense } from '@/lib/types';
import { expenseSchema, type ExpenseFormValues } from '@/components/expenses/schema';

interface UseAddExpenseProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense: Expense | null;
  onSuccess: (expense: Expense, isEdit: boolean) => void;
}

export function useAddExpense({
  userId,
  isOpen,
  onOpenChange,
  editingExpense,
  onSuccess,
}: UseAddExpenseProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: '',
      description: '',
      amount: 0,
      date: new Date(),
      paymentMethod: 'Cash',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        form.reset({
          name: editingExpense.name || '',
          description: editingExpense.description || '',
          amount: editingExpense.amount || 0,
          date: new Date(editingExpense.date),
          paymentMethod: editingExpense.paymentMethod || 'Cash',
        });
      } else {
        form.reset({
          name: '',
          description: '',
          amount: 0,
          date: new Date(),
          paymentMethod: 'Cash',
        });
      }
    }
  }, [isOpen, editingExpense, form]);

  const onSubmit = (data: ExpenseFormValues) => {
    startTransition(async () => {
      try {
        if (editingExpense) {
          const updated = await updateExpense(userId, editingExpense.id, data);
          toast({ title: 'Expense Updated', description: 'The expense has been updated successfully.' });
          onSuccess(updated, true);
        } else {
          const added = await addExpense(userId, data);
          toast({ title: 'Expense Added', description: 'The new expense has been recorded.' });
          onSuccess(added, false);
        }
        onOpenChange(false);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save expense.' });
      }
    });
  };

  return {
    form,
    isPending,
    onSubmit,
  };
}
