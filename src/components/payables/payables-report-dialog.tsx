'use client';

import * as React from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '../ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';

interface PayablesReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  asOfDate: Date | undefined;
  setAsOfDate: (date: Date | undefined) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  reportType: 'pending' | 'paid';
  setReportType: (type: 'pending' | 'paid') => void;
  handleDownload: (formatType: 'pdf' | 'xlsx') => void;
}

export function PayablesReportDialog({
  isOpen,
  onOpenChange,
  asOfDate,
  setAsOfDate,
  dateRange,
  setDateRange,
  reportType,
  setReportType,
  handleDownload,
}: PayablesReportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Download Report
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem onClick={() => setReportType('pending')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Pending Payables Report</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild>
            <DropdownMenuItem onClick={() => setReportType('paid')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Paid Payables Report</span>
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Report</DialogTitle>
          <DialogDescription>
            {reportType === 'pending'
              ? 'Download pending payables as of a specific date.'
              : 'Select a date range for exact paid payables.'}
          </DialogDescription>
        </DialogHeader>

        {reportType === 'pending' && (
          <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <div className="py-4 flex flex-col items-center">
              <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                <p>Select an &quot;As of&quot; date.</p>
                <p className="text-xs">Leave empty for today (current balance).</p>
              </div>
              <Calendar initialFocus mode="single" selected={asOfDate} onSelect={setAsOfDate} />
              {asOfDate && (
                <Button variant="outline" className="mt-2" onClick={() => setAsOfDate(undefined)}>
                  Clear Date (Use Today)
                </Button>
              )}
            </div>
          </ScrollArea>
        )}

        {reportType === 'paid' && (
          <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <div className="py-4 flex flex-col items-center">
              <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                <p>Select a date range for the report.</p>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
              />
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
          <Button variant="outline" onClick={() => handleDownload('pdf')}>
            <FileText className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={() => handleDownload('xlsx')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
