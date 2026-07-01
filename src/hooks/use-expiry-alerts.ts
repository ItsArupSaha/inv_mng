'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteItem, getCategories, getItems } from '@/lib/actions';
import type { Category, Item } from '@/lib/types';
import { isFuzzyMatch } from '@/lib/search-utils';
import { useExpiryExport } from './use-expiry-export';

interface UseExpiryAlertsProps {
  userId: string;
}

export function useExpiryAlerts({ userId }: UseExpiryAlertsProps) {
  const { authUser } = useAuth();
  const [allItems, setAllItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isItemDialogOpen, setIsItemDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState('expiringSoon');
  const [sortBy, setSortBy] = React.useState('expiry-asc');
  const [visibleCount, setVisibleCount] = React.useState(10);

  const loadData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const allItemsData = await getItems(userId);
      setAllItems(allItemsData);

      const categoriesData = await getCategories(userId);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load data. Please try again later.',
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, loadData]);

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleAddNewItem = () => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  const handleAddNewCategory = () => {
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    startTransition(async () => {
      try {
        await deleteItem(userId, id);
        await loadData();
        toast({ title: 'Item Deleted', description: 'The item has been removed from the inventory.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the item.' });
      }
    });
  };

  const filteredAndSortedItems = React.useMemo(() => {
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(now.getDate() + 30);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setDate(now.getDate() + 90);

    // Initial filter for items with expiry dates
    let result = allItems.filter(item => item.expiryDate);

    // Status filter
    if (selectedStatusFilter === 'expired') {
      result = result.filter(item => new Date(item.expiryDate!) <= now);
    } else if (selectedStatusFilter === 'expiringSoon') {
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp > now && exp <= oneMonthFromNow;
      });
    } else if (selectedStatusFilter === 'expiring3Months') {
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp > now && exp <= threeMonthsFromNow;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      const qLower = q.toLowerCase();
      
      let matched = result.filter(item => 
        item.title.toLowerCase().includes(qLower) ||
        item.categoryName.toLowerCase().includes(qLower) ||
        (item.medicineGroup && item.medicineGroup.toLowerCase().includes(qLower)) ||
        (item.company && item.company.toLowerCase().includes(qLower))
      );

      if (matched.length === 0) {
        matched = result.filter(item => 
          isFuzzyMatch(item.title, q) ||
          isFuzzyMatch(item.categoryName, q) ||
          (item.medicineGroup && isFuzzyMatch(item.medicineGroup, q)) ||
          (item.company && isFuzzyMatch(item.company, q))
        );
      }
      result = matched;
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.expiryDate!).getTime();
      const dateB = new Date(b.expiryDate!).getTime();

      if (sortBy === 'expiry-asc') {
        return dateA - dateB;
      }
      if (sortBy === 'expiry-desc') {
        return dateB - dateA;
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'group-asc') {
        const groupA = a.medicineGroup || '';
        const groupB = b.medicineGroup || '';
        return groupA.localeCompare(groupB);
      }
      if (sortBy === 'company-asc') {
        const companyA = a.company || '';
        const companyB = b.company || '';
        return companyA.localeCompare(companyB);
      }
      if (sortBy === 'stock-asc') {
        return a.stock - b.stock;
      }
      return 0;
    });

    return result;
  }, [allItems, searchQuery, selectedStatusFilter, sortBy]);

  const displayedItems = React.useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const hasMore = visibleCount < filteredAndSortedItems.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  // Call the expiry reports sub-hook
  const expiryExport = useExpiryExport({ authUser });

  return {
    categories,
    isInitialLoading,
    isItemDialogOpen,
    setIsItemDialogOpen,
    isCategoryDialogOpen,
    setIsCategoryDialogOpen,
    editingItem,
    searchQuery,
    setSearchQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    sortBy,
    setSortBy,
    setVisibleCount,
    isPending,
    loadData,
    handleEditItem,
    handleAddNewItem,
    handleAddNewCategory,
    handleDeleteItem,
    filteredAndSortedItems,
    displayedItems,
    hasMore,
    handleLoadMore,
    handlePdf: () => expiryExport.handlePdf(filteredAndSortedItems),
    handleXlsx: () => expiryExport.handleXlsx(filteredAndSortedItems),
  };
}
