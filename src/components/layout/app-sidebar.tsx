'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowRightLeft,
  Store,
  CreditCard,
  FileText,
  Package,
  ShoppingCart,
  ShoppingBag,
  AlertTriangle,
  ShieldAlert,
  FolderSync,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { getItems } from '@/lib/actions';
import { ProfileButton } from './profile-button';

export function AppSidebar() {
  const pathname = usePathname();
  const { authUser, user } = useAuth();
  const [alertCount, setAlertCount] = React.useState(0);
  const [stockWarningCount, setStockWarningCount] = React.useState(0);

  const refreshCounts = React.useCallback(() => {
    if (!user) return;
    getItems(user.uid)
      .then((items) => {
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

        const expCount = items.filter(
          (item) => item.expiryDate && new Date(item.expiryDate) <= ninetyDaysFromNow
        ).length;
        setAlertCount(expCount);

        const stockCount = items.filter((item) => item.isSalable !== false && item.stock < 1).length;
        setStockWarningCount(stockCount);
      })
      .catch((err) => console.error('Failed to fetch alert count for sidebar:', err));
  }, [user]);

  // Fetch badge counts once on login and when the tab regains focus,
  // instead of refetching the whole catalog on every navigation.
  React.useEffect(() => {
    refreshCounts();
    window.addEventListener('focus', refreshCounts);
    return () => window.removeEventListener('focus', refreshCounts);
  }, [refreshCounts]);

  const coreItems = React.useMemo(
    () => [
      { href: '/sales', icon: ShoppingCart, label: 'Sell' },
      { href: '/items', icon: Package, label: 'Medicines / Stocks' },
      { href: '/expenses', icon: CreditCard, label: 'Expense' },
      { href: '/purchases', icon: ShoppingBag, label: 'Purchase' },
      { href: '/expiry-alerts', icon: AlertTriangle, label: 'Expiry Alerts', badge: true },
      { href: '/stock-warnings', icon: ShieldAlert, label: 'Stock Warnings', stockBadge: true },
      { href: '/reports', icon: FileText, label: 'Reports' },
      { href: '/balance-sheet', icon: Store, label: 'Business Overview' },
    ],
    []
  );

  const otherItems = React.useMemo(
    () => [
      { href: '/payables', icon: ArrowRightLeft, label: 'Payables (Suppliers)' },
      { href: '/transfer', icon: ArrowLeftRight, label: 'Transfers (Cash/Bank)' },
      { href: '/bulk-shelf-update', icon: FolderSync, label: 'Shelf Update (Bulk)' },
    ],
    []
  );

  const renderMenuItems = (itemsList: typeof coreItems) => {
    return itemsList.map((item) => (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={pathname.startsWith(item.href)}
          tooltip={item.label}
          className="transition-all duration-200"
        >
          <Link href={item.href} className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5">
              <item.icon className="h-4 w-4" />
              <span className="font-medium text-[13px]">{item.label}</span>
            </div>
            {'badge' in item && alertCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground animate-pulse">
                {alertCount}
              </span>
            )}
            {'stockBadge' in item && stockWarningCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white animate-pulse">
                {stockWarningCount}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  };

  return (
    <Sidebar className="border-r bg-card/60 backdrop-blur-md">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col truncate">
            <h1 className="font-headline text-lg font-bold text-foreground truncate">
              {authUser?.companyName || 'Smart Stock'}
            </h1>
            <p className="text-xs text-muted-foreground capitalize">Pharmacy Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Core Operations
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2 mt-1">
            <SidebarMenu>{renderMenuItems(coreItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Others
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2 mt-1">
            <SidebarMenu>{renderMenuItems(otherItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t flex flex-col gap-4 bg-muted/20">
        <ProfileButton />
      </SidebarFooter>
    </Sidebar>
  );
}
