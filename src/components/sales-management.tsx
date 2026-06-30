'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Download, Loader2, PlusCircle, Search, X, FileText, FileSpreadsheet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from './ui/calendar';
import { ScrollArea } from './ui/scroll-area';
import { SalesTable } from './sales/sales-table';
import { RecordSaleForm } from './sales/record-sale-form';
import { useSalesManagement } from '@/hooks/use-sales-management';
import type { Item } from '@/lib/types';

interface SalesManagementProps {
  userId: string;
}

export default function SalesManagement({ userId }: SalesManagementProps) {
  const [activeTab, setActiveTab] = React.useState<'checkout' | 'history'>('checkout');
  const {
    authUser,
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
  } = useSalesManagement({ userId });

  const [directoryQuery, setDirectoryQuery] = React.useState('');

  const filteredDirectoryItems = React.useMemo(() => {
    const q = directoryQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    
    const matches = items.filter(item => 
      (item.title || '').toLowerCase().includes(q) ||
      (item.medicineGroup || '').toLowerCase().includes(q) ||
      (item.company || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q)
    );

    const getRelevanceScore = (item: Item) => {
      const title = (item.title || '').toLowerCase();
      const group = (item.medicineGroup || '').toLowerCase();
      const company = (item.company || '').toLowerCase();
      const location = (item.location || '').toLowerCase();

      if (title.startsWith(q)) return 1;
      if (title.includes(q)) return 2;
      if (group.startsWith(q)) return 3;
      if (group.includes(q)) return 4;
      if (company.startsWith(q)) return 5;
      if (company.includes(q)) return 6;
      if (location.includes(q)) return 7;
      return 8;
    };

    return matches.sort((a, b) => {
      const scoreA = getRelevanceScore(a);
      const scoreB = getRelevanceScore(b);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return (a.title || '').localeCompare(b.title || '');
    }).slice(0, 50);
  }, [directoryQuery, items]);

  return (
    <div className="space-y-6 animate-in fade-in-50 w-full max-w-none">
      {/* Tab toggle buttons */}
      <div className="flex gap-2 border-b pb-4">
        <Button
          variant={activeTab === 'checkout' ? 'default' : 'outline'}
          onClick={() => setActiveTab('checkout')}
          className="flex-1 sm:flex-initial"
        >
          Record Sale (POS)
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
          className="flex-1 sm:flex-initial"
        >
          Sales History
        </Button>
      </div>

      {activeTab === 'checkout' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start w-full">
          <Card className="xl:col-span-3 w-full">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">POS Receipt Checkout</CardTitle>
              <CardDescription>Select items, adjust prices, and confirm transactions instantly.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecordSaleForm
                userId={userId}
                items={items}
                customers={customers}
                onSuccess={loadInitialData}
                authUser={authUser}
              />
            </CardContent>
          </Card>

          {/* Directory Deep Search Panel */}
          <Card className="xl:col-span-1 w-full h-fit sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Directory Deep Search
              </CardTitle>
              <CardDescription className="text-xs">Search medicines by name, company, generic group, or shelf.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type to search directory..."
                  className="pl-8 w-full h-9 text-xs"
                  value={directoryQuery}
                  onChange={(e) => setDirectoryQuery(e.target.value)}
                />
                {directoryQuery && (
                  <button
                    onClick={() => setDirectoryQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-2">
                  {filteredDirectoryItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No matching medicines found.</p>
                  ) : (
                    filteredDirectoryItems.map((item) => (
                      <div key={item.id} className="p-2.5 border rounded-lg bg-card/40 hover:bg-card/85 transition-all duration-200 space-y-1.5 text-xs">
                        <div className="flex justify-between items-start gap-1">
                          <div className="font-bold text-foreground truncate flex-1" title={item.title}>{item.title}</div>
                          <div className="font-bold text-primary shrink-0">৳{Number(item.sellingPrice).toFixed(2)}</div>
                        </div>
                        
                        <div className="text-[10px] text-muted-foreground leading-tight truncate">
                          {item.company} {item.medicineGroup ? ` • ${item.medicineGroup}` : ''}
                        </div>

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            item.stock <= 5 
                              ? 'bg-destructive/15 text-destructive animate-pulse' 
                              : item.stock <= 20 
                                ? 'bg-amber-500/15 text-amber-600' 
                                : 'bg-emerald-500/15 text-emerald-600'
                          }`}>
                            Stock: {item.stock}
                          </span>
                          
                          {item.location && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-semibold truncate max-w-[120px]">
                              Shelf: {item.location}
                            </span>
                          )}

                          {item.expiryDate && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'bg-destructive/20 text-destructive animate-pulse'
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              Exp: {item.expiryDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle className="font-headline text-2xl">Sales History & Reports</CardTitle>
                <CardDescription>Search past invoices, reprint receipts, and download monthly statements.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-2 w-full lg:w-auto lg:justify-end">
                <div className="flex gap-2 w-full sm:w-auto sm:max-w-sm flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Memo # or Name..."
                      className="pl-8 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    {searchTerm && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => handleSearch()} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
                <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Download className="mr-2 h-4 w-4" /> Download Reports
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Download Sales Report</DialogTitle>
                      <DialogDescription>Select a date range to download your sales data.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                      <div className="py-4 flex flex-col items-center gap-4">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={1}
                        />
                        <p className="text-sm text-muted-foreground">
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                Selected: {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              <>Selected: {format(dateRange.from, "LLL dd, y")}</>
                            )
                          ) : (
                            <span>Please pick a start and end date.</span>
                          )}
                        </p>
                      </div>
                    </ScrollArea>
                    <DialogFooter className="pt-4 border-t">
                      <div className="flex flex-col gap-4 w-full">
                        <div>
                          <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Sales Report</p>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from} className="flex-1"><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                            <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from} className="flex-1"><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Items Sold Summary</p>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleDownloadItemsPdf} disabled={!dateRange?.from} className="flex-1"><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                            <Button variant="outline" onClick={handleDownloadItemsXlsx} disabled={!dateRange?.from} className="flex-1"><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
                          </div>
                        </div>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SalesTable
              userId={userId}
              sales={displaySales}
              items={items}
              customers={customers}
              isInitialLoading={isInitialLoading}
              isSearching={isSearching}
              isPending={isPending}
              onDelete={handleDelete}
              authUser={authUser}
            />
            {hasMore && !searchTerm && (
              <div className="flex justify-center mt-4">
                <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Load More'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

