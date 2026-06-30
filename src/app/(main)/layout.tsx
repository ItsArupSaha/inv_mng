
'use client';

import {
  ArrowLeftRight,
  ArrowRightLeft,
  Store,
  CreditCard,
  FileText,
  Gift,
  Home,
  LogIn,
  LogOut,
  Package,
  Presentation,
  RotateCcw,
  Scale,
  ShoppingBag,
  ShoppingCart,
  AlertTriangle,
  Loader2,
  FolderSync,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { getItems } from '@/lib/actions';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

function ProfileButton() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  if (user) {
    return (
      <div className="flex w-full items-center gap-3">
        <Avatar>
          <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png`} alt={user.displayName || 'User'} data-ai-hint="person" />
          <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col truncate flex-1">
          <span className="font-semibold text-sm truncate" title={user.displayName || 'User'}>{user.displayName || 'User'}</span>
          <span className="text-xs text-muted-foreground truncate" title={user.email || ''}>{user.email}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
          <LogOut />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSignIn} className="w-full">
      <LogIn className="mr-2 h-4 w-4" /> Sign In
    </Button>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authUser, user } = useAuth();
  const [alertCount, setAlertCount] = React.useState(0);

  React.useEffect(() => {
    if (user) {
      getItems(user.uid).then(items => {
        const now = new Date();
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setDate(now.getDate() + 30);
        const count = items.filter(item => item.expiryDate && new Date(item.expiryDate) <= oneMonthFromNow).length;
        setAlertCount(count);
      }).catch(err => console.error("Failed to fetch alert count for sidebar:", err));
    }
  }, [user, pathname]); // Re-fetch on path name change to update badges when editing/deleting

  const storeType = authUser?.storeType || 'general';

  // Dynamic Core items
  const coreItems = React.useMemo(() => [
    { href: '/sales', icon: ShoppingCart, label: 'Sell' },
    { 
      href: '/items', 
      icon: Package, 
      label: storeType === 'pharmacy' ? 'Items / Stocks' : storeType === 'bookstore' ? 'Books / Stocks' : 'Items & Stocks' 
    },
    { href: '/expenses', icon: CreditCard, label: 'Expense' },
    { href: '/purchases', icon: ShoppingBag, label: 'Purchase' },
    ...(storeType === 'pharmacy' ? [{ href: '/expiry-alerts', icon: AlertTriangle, label: 'Expiry Alerts', badge: true }] : []),
    { href: '/reports', icon: FileText, label: 'Monthly Report' },
    { href: '/balance-sheet', icon: Scale, label: 'Balance Sheet' },
  ], [storeType]);

  // Dynamic Other items
  const otherItems = React.useMemo(() => [
    ...(storeType !== 'pharmacy' ? [
      { href: '/expiry-alerts', icon: AlertTriangle, label: 'Expiry Alerts', badge: true },
      { href: '/packages', icon: Package, label: 'Packages / Combos' },
      { href: '/donations', icon: Gift, label: 'Donations' },
      { href: '/authority-presentation', icon: Presentation, label: 'Authority View' }
    ] : []),
    { href: '/payables', icon: ArrowRightLeft, label: 'Payables (Suppliers)' },
    { href: '/transfer', icon: ArrowLeftRight, label: 'Transfers (Cash/Bank)' },
    ...(storeType === 'pharmacy' ? [
      { href: '/bulk-shelf-update', icon: FolderSync, label: 'Shelf Update (Bulk)' }
    ] : []),
  ], [storeType]);

  const allNavItems = React.useMemo(() => [...coreItems, ...otherItems], [coreItems, otherItems]);
  const pageTitle = allNavItems.find(item => pathname.startsWith(item.href))?.label || 'Sell';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r bg-card/60 backdrop-blur-md">
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Store className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col truncate">
                <h1 className="font-headline text-lg font-bold text-foreground truncate">{authUser?.companyName || 'Smart Stock'}</h1>
                <p className="text-xs text-muted-foreground capitalize">{storeType} Management</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-2">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Core Operations
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2 mt-1">
                <SidebarMenu>
                  {coreItems.map((item) => (
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
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />

            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Others
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2 mt-1">
                <SidebarMenu>
                  {otherItems.map((item) => (
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
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t flex flex-col gap-4 bg-muted/20">
            <ProfileButton />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="max-w-full flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="font-headline text-xl font-bold tracking-tight text-foreground">
                {pageTitle}
              </h2>
            </div>
          </header>
          <main className="p-4 sm:p-6 w-full flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
