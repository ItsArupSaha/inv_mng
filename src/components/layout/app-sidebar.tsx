'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Users,
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
import { countExpiringItems, countLowStockSalableItems } from '@/lib/db/item-alerts';
import { APP_NAME } from '@/lib/app-info';
import { ProfileButton } from './profile-button';

export function AppSidebar() {
  const pathname = usePathname();
  const { authUser, user } = useAuth();
  const [alertCount, setAlertCount] = React.useState(0);
  const [stockWarningCount, setStockWarningCount] = React.useState(0);

  const refreshCounts = React.useCallback(() => {
    if (!user) return;
    Promise.all([
      countExpiringItems(user.uid, 90),
      countLowStockSalableItems(user.uid),
    ])
      .then(([expCount, stockCount]) => {
        setAlertCount(expCount);
        setStockWarningCount(stockCount);
      })
      .catch((err) => console.error('Failed to fetch badge counts for sidebar:', err));
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
      { href: '/suppliers', icon: Users, label: 'Supplier Ledger' },
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
      <SidebarHeader className="p-2 border-b">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Pharmora"
            width={200}
            height={200}
            priority
            className="h-24 w-24 object-contain shrink-0 drop-shadow-sm"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center pr-1">
            <h1
              className="font-headline text-lg sm:text-xl font-bold text-foreground leading-tight break-words whitespace-normal"
              title={authUser?.companyName || APP_NAME}
            >
              {authUser?.companyName || APP_NAME}
            </h1>
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
