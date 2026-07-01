'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { getCustomers, getCustomersPaginated } from '@/lib/actions';
import type { Customer } from '@/lib/types';

interface UseCustomerSearchPaginationProps {
  userId: string;
}

export function useCustomerSearchPagination({ userId }: UseCustomerSearchPaginationProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

  // Load all customers for search functionality
  const loadAllCustomers = React.useCallback(async () => {
    try {
      const allCustomersData = await getCustomers(userId);
      setAllCustomers(allCustomersData);
    } catch (error) {
      console.error('Failed to load all customers for search:', error);
    }
  }, [userId]);

  const loadInitialCustomers = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { customers: refreshedCustomers, hasMore: refreshedHasMore } =
        await getCustomersPaginated({ userId, pageLimit: 5 });
      setCustomers(refreshedCustomers);
      setHasMore(refreshedHasMore);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load customer data. Please try again later.',
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialCustomers();
      loadAllCustomers();
    }
  }, [userId, loadInitialCustomers, loadAllCustomers]);

  // Search functionality
  const performSearch = React.useCallback(
    (query: string) => {
      if (!query.trim()) {
        loadInitialCustomers();
        return;
      }

      setIsSearching(true);

      const searchTerms = query
        .toLowerCase()
        .trim()
        .split(' ')
        .filter((term) => term.length > 0);

      if (searchTerms.length === 0) {
        loadInitialCustomers();
        return;
      }

      const searchResults = allCustomers.filter((customer) => {
        const customerName = customer.name.toLowerCase();
        return searchTerms.every((term) => customerName.includes(term));
      });

      const sortedResults = searchResults.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aStartsWithFirstTerm = aName.startsWith(searchTerms[0]);
        const bStartsWithFirstTerm = bName.startsWith(searchTerms[0]);

        if (aStartsWithFirstTerm && !bStartsWithFirstTerm) return -1;
        if (!aStartsWithFirstTerm && bStartsWithFirstTerm) return 1;

        const aStartsWithAnyTerm = searchTerms.some((term) => aName.startsWith(term));
        const bStartsWithAnyTerm = searchTerms.some((term) => bName.startsWith(term));

        if (aStartsWithAnyTerm && !bStartsWithAnyTerm) return -1;
        if (!aStartsWithAnyTerm && bStartsWithAnyTerm) return 1;

        const aHasFirstTermAtWordStart = aName.includes(` ${searchTerms[0]}`) || aName.startsWith(searchTerms[0]);
        const bHasFirstTermAtWordStart = bName.includes(` ${searchTerms[0]}`) || bName.startsWith(searchTerms[0]);

        if (aHasFirstTermAtWordStart && !bHasFirstTermAtWordStart) return -1;
        if (!aHasFirstTermAtWordStart && bHasFirstTermAtWordStart) return 1;

        return aName.localeCompare(bName);
      });

      const limitedResults = sortedResults.slice(0, 10);

      setCustomers(limitedResults);
      setHasMore(sortedResults.length > 10);
      setIsSearching(false);
    },
    [allCustomers, loadInitialCustomers]
  );

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    loadInitialCustomers();
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    if (searchQuery.trim()) {
      const searchTerms = searchQuery
        .toLowerCase()
        .trim()
        .split(' ')
        .filter((term) => term.length > 0);
      const searchResults = allCustomers.filter((customer) => {
        const customerName = customer.name.toLowerCase();
        return searchTerms.every((term) => customerName.includes(term));
      });

      const currentCount = customers.length;
      const nextBatch = searchResults.slice(currentCount, currentCount + 5);

      if (nextBatch.length > 0) {
        setCustomers((prev) => [...prev, ...nextBatch]);
        setHasMore(currentCount + nextBatch.length < searchResults.length);
      } else {
        setHasMore(false);
      }
    } else {
      setIsLoadingMore(true);
      const lastCustomerId = customers[customers.length - 1]?.id;
      try {
        const { customers: newCustomers, hasMore: newHasMore } = await getCustomersPaginated({
          userId,
          pageLimit: 5,
          lastVisibleId: lastCustomerId,
        });
        setCustomers((prev) => [...prev, ...newCustomers]);
        setHasMore(newHasMore);
      } catch (error) {
        console.error('Failed to load more customers:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load more customers.',
        });
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  return {
    customers,
    setCustomers,
    allCustomers,
    hasMore,
    setHasMore,
    isInitialLoading,
    isLoadingMore,
    searchQuery,
    setSearchQuery,
    isSearching,
    loadAllCustomers,
    loadInitialCustomers,
    performSearch,
    handleSearchChange,
    clearSearch,
    handleLoadMore,
  };
}
