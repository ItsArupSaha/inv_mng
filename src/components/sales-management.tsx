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
import { RecordSaleDialog } from './sales/record-sale-dialog';
import { useSalesManagement } from '@/hooks/use-sales-management';

interface SalesManagementProps {
  userId: string;
}

export default function SalesManagement({ userId }: SalesManagementProps) {
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

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="font-headline text-2xl">Record and View Sales</CardTitle>
              <CardDescription>Create new sales transactions and view past sales history.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-2 w-full lg:w-auto lg:justify-end">
              <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Record New Sale
              </Button>
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

      <RecordSaleDialog
        userId={userId}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        items={items}
        customers={customers}
        onSuccess={loadInitialData}
        authUser={authUser}
      />
    </>
  );
}

