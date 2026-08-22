'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Dynamic Page Title resolution based on current path
  const pageTitle = React.useMemo(() => {
    const matched = [
      { href: '/sales', label: 'Sell' },
      { href: '/items', label: 'Medicines / Stocks' },
      { href: '/expenses', label: 'Expense' },
      { href: '/purchases', label: 'Purchase' },
      { href: '/expiry-alerts', label: 'Expiry Alerts' },
      { href: '/stock-warnings', label: 'Stock Warnings' },
      { href: '/reports', label: 'Reports' },
      { href: '/balance-sheet', label: 'Business Overview' },
      { href: '/dues', label: 'Customer Dues' },
      { href: '/payables', label: 'Payables (Suppliers)' },
      { href: '/bulk-shelf-update', label: 'Shelf Update (Bulk)' },
    ].find((item) => pathname.startsWith(item.href));

    return matched?.label || 'Sell';
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="max-w-full flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="font-headline text-xl font-bold tracking-tight text-foreground">
                {pageTitle}
              </h2>
            </div>
          </header>
          <main className="p-4 sm:p-6 w-full flex-1 min-w-0 overflow-hidden">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
