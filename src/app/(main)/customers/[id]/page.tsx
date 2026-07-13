'use client';

import * as React from 'react';
import { Book } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCustomerDetail } from '@/hooks/use-customer-detail';
import { CustomerInfoCard } from '@/components/customers/customer-info-card';
import { CustomerTransactionsTable } from '@/components/customers/customer-transactions-table';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { user } = useAuth();
  const { customerData, activities, items, loading, error } = useCustomerDetail({ params, user });

  if (!user || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customerData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Customer Not Found</h1>
          <p className="text-muted-foreground mt-2">The customer you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const customer = {
    ...customerData,
    dueBalance: customerData.dueBalance ?? customerData.openingBalance,
  };

  return (
    <div className="animate-in fade-in-50 space-y-6">
      <CustomerInfoCard customer={customer} />
      <CustomerTransactionsTable
        activities={activities}
        customerName={customer.name}
        items={items}
      />
    </div>
  );
}
