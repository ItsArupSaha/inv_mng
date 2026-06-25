import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteCategory, deleteItem, getCategories, getItems, calculateClosingStock } from '@/lib/actions';
import type { Category, ClosingStock, Item } from '@/lib/types';
import { exportClosingStockPdf, exportClosingStockXlsx } from '@/components/items/items-export-utils';

export function useItemManagement(userId: string) {
  const { authUser } = useAuth();
  const [allItems, setAllItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);

  // Dialog Open States
  const [isItemDialogOpen, setIsItemDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);

  // Editing States
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  // Closing Stock
  const [closingStockDate, setClosingStockDate] = React.useState<Date | undefined>(new Date());
  const [closingStockData, setClosingStockData] = React.useState<ClosingStock[]>([]);
  const [isCalculating, setIsCalculating] = React.useState(false);

  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('title-asc');
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
    setEditingCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
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

  const handleDeleteCategory = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCategory(userId, id);
        await loadData();
        toast({ title: 'Category Deleted', description: 'The category has been removed.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the category.' });
      }
    });
  };

  const handleCalculateClosingStock = async () => {
    if (!closingStockDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date.' });
      return;
    }

    setIsCalculating(true);
    try {
      const calculatedData = await calculateClosingStock(userId, closingStockDate);
      setClosingStockData(calculatedData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not calculate closing stock.' });
    } finally {
      setIsCalculating(false);
      setIsStockDialogOpen(false);
    }
  };

  const handleDownloadClosingStockPdf = () => {
    if (!closingStockDate) return;
    exportClosingStockPdf(closingStockData, closingStockDate, authUser);
  };

  const handleDownloadClosingStockXlsx = () => {
    if (!closingStockDate) return;
    exportClosingStockXlsx(closingStockData, closingStockDate, authUser?.storeType);
  };

  const expiringAndExpiredMedicines = React.useMemo(() => {
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(now.getDate() + 30);

    return allItems.filter((item) => {
      if (!item.expiryDate) return false;
      const exp = new Date(item.expiryDate);
      return exp <= oneMonthFromNow;
    });
  }, [allItems]);

  // Client-side filtering & sorting
  const filteredAndSortedItems = React.useMemo(() => {
    let result = [...allItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          (item.author && item.author.toLowerCase().includes(q)) ||
          (item.medicineGroup && item.medicineGroup.toLowerCase().includes(q)) ||
          (item.company && item.company.toLowerCase().includes(q))
      );
    }

    if (selectedCategoryFilter !== 'all') {
      result = result.filter((item) => item.categoryId === selectedCategoryFilter);
    }

    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(now.getDate() + 30);

    if (selectedStatusFilter === 'lowStock') {
      result = result.filter((item) => item.stock <= 5);
    } else if (selectedStatusFilter === 'expiringSoon') {
      result = result.filter((item) => {
        if (!item.expiryDate) return false;
        const exp = new Date(item.expiryDate);
        return exp > now && exp <= oneMonthFromNow;
      });
    } else if (selectedStatusFilter === 'expired') {
      result = result.filter((item) => {
        if (!item.expiryDate) return false;
        const exp = new Date(item.expiryDate);
        return exp <= now;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'stock-asc') {
        return a.stock - b.stock;
      }
      if (sortBy === 'stock-desc') {
        return b.stock - a.stock;
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
      if (sortBy === 'expiry-asc') {
        const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return dateA - dateB;
      }
      return 0;
    });

    return result;
  }, [allItems, searchQuery, selectedCategoryFilter, selectedStatusFilter, sortBy]);

  const displayedItems = React.useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const hasMore = visibleCount < filteredAndSortedItems.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  return {
    allItems,
    categories,
    isInitialLoading,
    isItemDialogOpen,
    setIsItemDialogOpen,
    isCategoryDialogOpen,
    setIsCategoryDialogOpen,
    isStockDialogOpen,
    setIsStockDialogOpen,
    editingItem,
    editingCategory,
    closingStockDate,
    setClosingStockDate,
    closingStockData,
    setClosingStockData,
    isCalculating,
    isPending,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    sortBy,
    setSortBy,
    visibleCount,
    setVisibleCount,
    loadData,
    handleEditItem,
    handleAddNewItem,
    handleAddNewCategory,
    handleEditCategory,
    handleDeleteItem,
    handleDeleteCategory,
    handleCalculateClosingStock,
    handleDownloadClosingStockPdf,
    handleDownloadClosingStockXlsx,
    expiringAndExpiredMedicines,
    filteredAndSortedItems,
    displayedItems,
    hasMore,
    handleLoadMore
  };
}
