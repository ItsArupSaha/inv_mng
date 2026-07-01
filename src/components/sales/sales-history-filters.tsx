'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Download, FileSpreadsheet, FileText, Loader2, Search, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '../ui/calendar';
import { ScrollArea } from '../ui/scroll-area';

interface SalesHistoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearching: boolean;
  handleSearch: () => void;
  handleClearSearch: () => void;
  isDownloadDialogOpen: boolean;
  setIsDownloadDialogOpen: (open: boolean) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  handleDownloadPdf: () => void;
  handleDownloadXlsx: () => void;
  handleDownloadItemsPdf: () => void;
  handleDownloadItemsXlsx: () => void;
}

export function SalesHistoryFilters({
  searchTerm,
  setSearchTerm,
  isSearching,
  handleSearch,
  handleClearSearch,
  isDownloadDialogOpen,
  setIsDownloadDialogOpen,
  dateRange,
  setDateRange,
  handleDownloadPdf,
  handleDownloadXlsx,
  handleDownloadItemsPdf,
  handleDownloadItemsXlsx,
}: SalesHistoryFiltersProps) {
  return (
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
        <Button variant="secondary" onClick={handleSearch} disabled={isSearching}>
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
                      Selected: {format(dateRange.from, 'LLL dd, y')} -{' '}
                      {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    <>Selected: {format(dateRange.from, 'LLL dd, y')}</>
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
                <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                  Sales Report
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from} className="flex-1">
                    <FileText className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from} className="flex-1">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                  Items Sold Summary
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadItemsPdf} disabled={!dateRange?.from} className="flex-1">
                    <FileText className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button variant="outline" onClick={handleDownloadItemsXlsx} disabled={!dateRange?.from} className="flex-1">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                  </Button>
                </div>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
