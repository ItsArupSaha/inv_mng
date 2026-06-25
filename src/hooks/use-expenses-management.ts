'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteExpense, getExpensesPaginated } from '@/lib/actions';
import type { Expense } from '@/lib/types';
import { downloadExpensesPdf, downloadExpensesXlsx } from '@/components/expenses/expenses-export-utils';

interface UseExpensesManagementProps {
  userId: string;
}

export function useExpensesManagement({ userId }: UseExpensesManagementProps) {
  const { authUser } = useAuth();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { expenses: newExpenses, hasMore: newHasMore } = await getExpensesPaginated({ userId, pageLimit: 5 });
      setExpenses(newExpenses);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load expenses.' });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId, loadInitialData]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastExpenseId = expenses[expenses.length - 1]?.id;
    try {
      const { expenses: newExpenses, hasMore: newHasMore } = await getExpensesPaginated({ userId, pageLimit: 5, lastVisibleId: lastExpenseId });
      setExpenses(prev => [...prev, ...newExpenses]);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load more expenses.' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteExpense(userId, id);
        setExpenses(prev => prev.filter(e => e.id !== id));
        toast({ title: 'Expense Deleted', description: 'The expense has been removed.' });
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete expense.' });
      }
    });
  };

  const handleSuccess = (expense: Expense, isEdit: boolean) => {
    if (isEdit) {
      setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
    } else {
      setExpenses(prev => [expense, ...prev]);
    }
    loadInitialData();
  };

  const handleDownloadPdf = async () => {
    try {
      const success = await downloadExpensesPdf(userId, dateRange, authUser);
      if (!success) {
        toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      }
      setIsDownloadDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download PDF.' });
    }
  };

  const handleDownloadXlsx = async () => {
    try {
      const success = await downloadExpensesXlsx(userId, dateRange);
      if (!success) {
        toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      }
      setIsDownloadDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download Excel.' });
    }
  };

  return {
    expenses,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    editingExpense,
    dateRange,
    setDateRange,
    isPending,
    handleLoadMore,
    handleAddNew,
    handleEdit,
    handleDelete,
    handleSuccess,
    handleDownloadPdf,
    handleDownloadXlsx,
  };
}
