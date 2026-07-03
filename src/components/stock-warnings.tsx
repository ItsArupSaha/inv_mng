'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Package, 
  Search, 
  ShoppingBag, 
  ShieldAlert, 
  Loader2 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getItems, ignoreItemWarning, getCategories } from '@/lib/actions';
import type { Item, Category } from '@/lib/types';
import { isFuzzyMatch } from '@/lib/search-utils';
import { cn } from '@/lib/utils';

interface StockWarningsProps {
  userId: string;
}

export default function StockWarnings({ userId }: StockWarningsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPending, startTransition] = React.useTransition();

  // Tab State: 'active' or 'ignored'
  const [activeTab, setActiveTab] = React.useState<'active' | 'ignored'>('active');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stockThreshold, setStockThreshold] = React.useState<number>(5);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [allItems, allCategories] = await Promise.all([
        getItems(userId),
        getCategories(userId)
      ]);
      setItems(allItems);
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load stock warning data:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading data',
        description: 'Could not retrieve items from inventory. Please try again.'
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
    // Save original state for rollback on error
    const originalItems = [...items];

    // Optimistically update the state instantly
    setItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, ignoredWarning: shouldIgnore } 
          : item
      )
    );

    startTransition(async () => {
      try {
        await ignoreItemWarning(userId, itemId, shouldIgnore);
        toast({
          title: shouldIgnore ? 'Warning Ignored' : 'Warning Restored',
          description: shouldIgnore 
            ? 'This item will be hidden from stock warnings until it hits 0 stock.'
            : `This item will now trigger warnings below ${stockThreshold} stock.`
        });
      } catch (error) {
        console.error('Failed to toggle ignore state:', error);
        // Rollback state on failure
        setItems(originalItems);
        toast({
          variant: 'destructive',
          title: 'Action failed',
          description: 'Failed to update warning status. Please try again.'
        });
      }
    });
  };

  // Warning Filters
  const { activeWarnings, ignoredWarnings } = React.useMemo(() => {
    const active: Item[] = [];
    const ignored: Item[] = [];

    items.forEach(item => {
      // Exclude assets and surgicals from stock warnings
      const catNameLower = (item.categoryName || '').toLowerCase();
      if (catNameLower === 'assets' || catNameLower === 'surgicals') {
        return;
      }

      // Check if stock is low or out
      if (item.stock === 0) {
        active.push(item); // 0 stock always goes to active, ignoring the ignore flag
      } else if (item.stock < stockThreshold) {
        if (item.ignoredWarning) {
          ignored.push(item);
        } else {
          active.push(item);
        }
      }
    });

    // Sort both arrays: lower quantities first (0 quantity first)
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
    return list.filter(item => {
      const matchText = `${item.title} ${item.categoryName} ${item.medicineGroup || ''} ${item.company || ''}`.toLowerCase();
      return matchText.includes(query) || 
             isFuzzyMatch(item.title, query) || 
             isFuzzyMatch(item.categoryName, query);
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        <Card className="border border-red-200/60 bg-red-50/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-700/80 font-medium">Out of Stock</CardDescription>
            <CardTitle className="text-3xl font-bold font-headline text-red-900 flex items-center justify-between">
              {activeWarnings.filter(i => i.stock === 0).length}
              <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-amber-200/60 bg-amber-50/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-700/80 font-medium">Low Stock Alerts</CardDescription>
            <CardTitle className="text-3xl font-bold font-headline text-amber-900 flex items-center justify-between">
              {activeWarnings.filter(i => i.stock > 0).length}
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Table Card */}
      <Card className="max-w-5xl mx-auto border border-muted/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-2xl">
                {activeTab === 'active' ? 'Active Stock Warnings' : 'Ignored Warnings'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'active'
                  ? `List of items requiring attention (Out of stock or less than ${stockThreshold} units).`
                  : 'Items with low stock that you chose to ignore (Will reappear automatically if stock hits 0).'}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Threshold:</span>
                <Select
                  value={stockThreshold.toString()}
                  onValueChange={(val) => setStockThreshold(parseInt(val, 10))}
                >
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent position="popper">
                      <SelectItem value="5" className="text-xs">Below 5 units</SelectItem>
                      <SelectItem value="10" className="text-xs">Below 10 units</SelectItem>
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  className="pl-8 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading stock warnings...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center border-2 border-dashed rounded-lg">
              <Package className="h-10 w-10 text-muted-foreground/60" />
              <div>
                <p className="font-semibold text-foreground">No warnings found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try clearing your search query.' : 'Everything looks well stocked!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Stock Level</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isOutOfStock = item.stock === 0;

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div>
                            <span className="block text-sm text-foreground">{item.title}</span>
                            {(item.medicineGroup || item.company) && (
                              <span className="block text-[11px] text-muted-foreground">
                                {item.company} {item.medicineGroup ? ` - ${item.medicineGroup}` : ''}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.location || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "font-semibold text-xs",
                                isOutOfStock 
                                  ? "bg-red-100 text-red-800 hover:bg-red-100" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              )}
                            >
                              {isOutOfStock ? 'Out of Stock' : `Low Stock: ${item.stock}`}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {activeTab === 'active' ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleIgnore(item.id, true)}
                                  disabled={isOutOfStock} // 0 stock can never be ignored
                                  title={isOutOfStock ? 'Out of stock items cannot be ignored' : 'Ignore this warning'}
                                  className="h-8 border-muted text-xs flex items-center gap-1"
                                >
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Ignore
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push('/purchases')}
                                  className="h-8 border-muted text-xs flex items-center gap-1 text-primary hover:text-primary"
                                >
                                  <ShoppingBag className="h-3.5 w-3.5" />
                                  Restock
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleIgnore(item.id, false)}
                                className="h-8 border-muted text-xs flex items-center gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Unignore
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
