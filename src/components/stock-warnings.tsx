'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getItems, ignoreItemWarning, getCategories } from '@/lib/actions';
import type { Item, Category } from '@/lib/types';
import { isFuzzyMatch } from '@/lib/search-utils';
import { StockWarningsKpis } from './stock-warnings/stock-warnings-kpis';
import { StockWarningsTable } from './stock-warnings/stock-warnings-table';

interface StockWarningsProps {
  userId: string;
}

export default function StockWarnings({ userId }: StockWarningsProps) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [, startTransition] = React.useTransition();

  // Tab State: 'active' or 'ignored'
  const [activeTab, setActiveTab] = React.useState<'active' | 'ignored'>('active');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stockThreshold, setStockThreshold] = React.useState<number>(5);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [allItems, allCategories] = await Promise.all([
        getItems(userId),
        getCategories(userId),
      ]);
      setItems(allItems);
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load stock warning data:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading data',
        description: 'Could not retrieve items from inventory. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, loadData]);

  // Handle Ignore/Unignore Actions
  const handleToggleIgnore = async (itemId: string, shouldIgnore: boolean) => {
    const originalItems = [...items];

    // Optimistically update the state instantly
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ignoredWarning: shouldIgnore } : item))
    );

    startTransition(async () => {
      try {
        await ignoreItemWarning(userId, itemId, shouldIgnore);
        toast({
          title: shouldIgnore ? 'Warning Ignored' : 'Warning Restored',
          description: shouldIgnore
            ? 'This item will be hidden from stock warnings until it hits 0 stock.'
            : `This item will now trigger warnings below ${stockThreshold} stock.`,
        });
      } catch (error) {
        console.error('Failed to toggle ignore state:', error);
        setItems(originalItems);
        toast({
          variant: 'destructive',
          title: 'Action failed',
          description: 'Failed to update warning status. Please try again.',
        });
      }
    });
  };

  // Warning Filters
  const { activeWarnings, ignoredWarnings } = React.useMemo(() => {
    const active: Item[] = [];
    const ignored: Item[] = [];

    items.forEach((item) => {
      const catNameLower = (item.categoryName || '').toLowerCase();
      if (catNameLower === 'assets' || catNameLower === 'surgicals') {
        return;
      }

      if (item.stock === 0) {
        active.push(item);
      } else if (item.stock < stockThreshold) {
        if (item.ignoredWarning) {
          ignored.push(item);
        } else {
          active.push(item);
        }
      }
    });

    const sortFn = (a: Item, b: Item) => a.stock - b.stock;
    active.sort(sortFn);
    ignored.sort(sortFn);

    return { activeWarnings: active, ignoredWarnings: ignored };
  }, [items, stockThreshold]);

  // Apply search query filter to selected tab items
  const filteredItems = React.useMemo(() => {
    const list = activeTab === 'active' ? activeWarnings : ignoredWarnings;
    if (!searchQuery.trim()) return list;

    const query = searchQuery.trim().toLowerCase();
    return list.filter((item) => {
      const matchText =
        `${item.title} ${item.categoryName} ${item.medicineGroup || ''} ${item.company || ''}`.toLowerCase();
      return (
        matchText.includes(query) ||
        isFuzzyMatch(item.title, query) ||
        isFuzzyMatch(item.categoryName, query)
      );
    });
  }, [activeTab, activeWarnings, ignoredWarnings, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Tab Selector Toggle System */}
      <div className="flex gap-2 justify-center max-w-2xl mx-auto border-b pb-4">
        <Button
          type="button"
          variant={activeTab === 'active' ? 'default' : 'outline'}
          onClick={() => setActiveTab('active')}
          className="flex-1 transition-all"
        >
          Active Warnings ({activeWarnings.length})
        </Button>
        <Button
          type="button"
          variant={activeTab === 'ignored' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ignored')}
          className="flex-1 transition-all"
        >
          Ignored Warnings ({ignoredWarnings.length})
        </Button>
      </div>

      <StockWarningsKpis activeWarnings={activeWarnings} />

      <StockWarningsTable
        isLoading={isLoading}
        filteredItems={filteredItems}
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        stockThreshold={stockThreshold}
        setStockThreshold={setStockThreshold}
        handleToggleIgnore={handleToggleIgnore}
      />
    </div>
  );
}
