'use client';

import * as React from 'react';
import { getCustomerById, getTransactionsForCustomer, getSalesForCustomer, getItems } from '@/lib/actions';
import type { Item } from '@/lib/types';

interface UseCustomerDetailProps {
  params: Promise<{ id: string }>;
  user: any;
}

export function useCustomerDetail({ params, user }: UseCustomerDetailProps) {
  const [customerData, setCustomerData] = React.useState<any>(null);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const { id } = await params;

        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        console.log('Customer Detail Page Debug:', { customerId: id, userId: user.uid });

        // Get customer data
        const customer = await getCustomerById(user.uid, id);
        console.log('Customer Data:', customer);

        if (!customer) {
          setError('Customer not found');
          setLoading(false);
          return;
        }

        // Get transactions for this customer
        const customerTransactions = await getTransactionsForCustomer(user.uid, id, 'Receivable');
        const customerSales = await getSalesForCustomer(user.uid, id);

        // Fetch items so we can display the titles for the sale rows
        const allItems = await getItems(user.uid);

        // Combine them into a single timeline Activity array
        const combinedActivities = [
          ...customerTransactions
            .filter(t => !t.description?.startsWith('Due from SALE'))
            .map(t => ({ ...t, activityType: 'transaction', sortDate: new Date(t.dueDate).getTime() })),
          ...customerSales.map(s => ({ ...s, activityType: 'sale', sortDate: new Date(s.date).getTime() }))
        ].sort((a, b) => b.sortDate - a.sortDate);

        setCustomerData(customer);
        setActivities(combinedActivities);
        setItems(allItems);
        setLoading(false);
      } catch (err) {
        console.error('Error loading customer data:', err);
        setError('Failed to load customer data');
        setLoading(false);
      }
    };

    loadData();
  }, [params, user]);

  return {
    customerData,
    activities,
    items,
    loading,
    error,
  };
}
