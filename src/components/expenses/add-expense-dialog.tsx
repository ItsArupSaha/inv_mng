'use client';

import * as React from 'react';
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
import { useAddExpense } from '@/hooks/use-add-expense';
import type { Expense } from '@/lib/types';
import { ExpenseFormFields } from './expense-form-fields';

interface AddExpenseDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense: Expense | null;
  onSuccess: (expense: Expense, isEdit: boolean) => void;
}

export function AddExpenseDialog({
  userId,
  isOpen,
  onOpenChange,
  editingExpense,
  onSuccess,
}: AddExpenseDialogProps) {
  const { form, isPending, onSubmit } = useAddExpense({
    userId,
    isOpen,
    onOpenChange,
    editingExpense,
    onSuccess,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription>
            {editingExpense
              ? 'Update the details for this expense.'
              : 'Enter the details for the new expense.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
              <ExpenseFormFields form={form} />
            </div>
            <DialogFooter className="pt-4 border-t px-4 pb-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
