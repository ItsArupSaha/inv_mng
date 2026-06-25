'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteSale, getCustomers, getItems, getSalesPaginated, searchSales } from '@/lib/actions';
import type { Customer, Item, Sale } from '@/lib/types';
import {
  downloadSalesPdf,
  downloadSalesXlsx,
  downloadSalesItemsPdf,
  downloadSalesItemsXlsx,
} from '@/components/sales/sales-export-utils';

interface UseSalesManagementProps {
  userId: string;
}

export function useSalesManagement({ userId }: UseSalesManagementProps) {
  const { authUser } = useAuth();
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<Sale[]>([]);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const [{ sales: newSales, hasMore: newHasMore }, itemsData, customersData] = await Promise.all([
        getSalesPaginated({ userId, pageLimit: 5 }),
        getItems(userId),
        getCustomers(userId),
      ]);
      setSales(newSales);
      setHasMore(newHasMore);
      setItems(itemsData);
      setCustomers(customersData);
    } catch (error) {
      console.error("Failed to load initial sales data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load data. Please try again later.",
      });
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
    const lastSaleId = sales[sales.length - 1]?.id;
    try {
      const { sales: newSales, hasMore: newHasMore } = await getSalesPaginated({ userId, pageLimit: 5, lastVisibleId: lastSaleId });
      setSales(prev => [...prev, ...newSales]);
      setHasMore(newHasMore);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load more sales.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchSales(userId, searchTerm.trim());
      setSearchResults(results);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Search Error', description: 'Failed to search sales.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const displaySales = searchTerm.trim() !== '' ? searchResults : sales;

  const handleDelete = (saleId: string) => {
    startTransition(async () => {
      const result = await deleteSale(userId, saleId);
      if (result.success) {
        toast({ title: 'Sale Deleted', description: 'The sale has been removed and stock restored.' });
        loadInitialData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to delete sale.' });
      }
    });
  };

  const handleDownloadPdf = async () => {
    try {
      const success = await downloadSalesPdf(userId, dateRange, authUser, items, customers);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download PDF." });
    }
  };

  const handleDownloadXlsx = async () => {
    try {
      const success = await downloadSalesXlsx(userId, dateRange, items, customers);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download Excel." });
    }
  };

  const handleDownloadItemsPdf = async () => {
    try {
      const success = await downloadSalesItemsPdf(userId, dateRange, authUser, items);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download PDF." });
    }
  };

  const handleDownloadItemsXlsx = async () => {
    try {
      const success = await downloadSalesItemsXlsx(userId, dateRange, items);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download Excel." });
    }
  };

  return {
    authUser,
    sales,
    items,
    customers,
    isDialogOpen,
    setIsDialogOpen,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    dateRange,
    setDateRange,
    isPending,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    searchTerm,
    setSearchTerm,
    isSearching,
    displaySales,
    loadInitialData,
    handleLoadMore,
    handleSearch,
    handleClearSearch,
    handleDelete,
    handleDownloadPdf,
    handleDownloadXlsx,
    handleDownloadItemsPdf,
    handleDownloadItemsXlsx,
  };
}
