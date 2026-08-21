'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteItem, getCategories, getItems } from '@/lib/actions';
import type { Category, Item } from '@/lib/types';
import { expiryFilterLabel, summarizeExpiryTiers } from '@/lib/expiry-stats';
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
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState('expiring90d');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState('all');
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

  // Extract unique list of companies
  const companies = React.useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((item) => {
      if (item.company && item.company.trim()) {
        set.add(item.company.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  // Taka-at-risk snapshot across all tiers, independent of the active filter
  const expirySummary = React.useMemo(() => summarizeExpiryTiers(allItems), [allItems]);

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
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);

    // Initial filter: dated items that still have stock on the shelf — an
    // expired medicine with zero stock is history, not a warning.
    let result = allItems.filter(item => item.expiryDate && (Number(item.stock) || 0) > 0);

    // Status / Timeframe filter
    if (selectedStatusFilter === 'expired') {
      result = result.filter(item => new Date(item.expiryDate!) <= now);
    } else if (selectedStatusFilter === 'expiring30d' || selectedStatusFilter === 'expiringSoon') {
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp > now && exp <= thirtyDaysFromNow;
      });
    } else if (selectedStatusFilter === 'expiring60d') {
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp > now && exp <= sixtyDaysFromNow;
      });
    } else if (selectedStatusFilter === 'expiring90d') {
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp > now && exp <= ninetyDaysFromNow;
      });
    }

    // Company filter
    if (selectedCompanyFilter !== 'all') {
      result = result.filter(item => (item.company || '').trim().toLowerCase() === selectedCompanyFilter.toLowerCase());
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
  }, [allItems, searchQuery, selectedStatusFilter, selectedCompanyFilter, sortBy]);

  const displayedItems = React.useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const hasMore = visibleCount < filteredAndSortedItems.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  // Call the expiry reports sub-hook
  const expiryExport = useExpiryExport({ authUser });
  const reportTitle = expiryFilterLabel(selectedStatusFilter);

  return {
    categories,
    companies,
    expirySummary,
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
    selectedCompanyFilter,
    setSelectedCompanyFilter,
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
    handlePdf: () => expiryExport.handlePdf(filteredAndSortedItems, reportTitle),
    handleXlsx: () => expiryExport.handleXlsx(filteredAndSortedItems, reportTitle),
  };
}
