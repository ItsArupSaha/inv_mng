'use client';

import * as React from 'react';
import { FileSpreadsheet, FileText, MoreVertical } from 'lucide-react';
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

interface ReceivablesReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  reportType: 'pending' | 'received';
  setReportType: (type: 'pending' | 'received') => void;
  handleDownload: (formatType: 'pdf' | 'xlsx') => void;
}

export function ReceivablesReportDialog({
  isOpen,
  onOpenChange,
  dateRange,
  setDateRange,
  reportType,
  setReportType,
  handleDownload,
}: ReceivablesReportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem onClick={() => setReportType('pending')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Pending Dues Report</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild>
            <DropdownMenuItem onClick={() => setReportType('received')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Received Payments Report</span>
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Report</DialogTitle>
          <DialogDescription>
            {reportType === 'pending'
              ? 'Download a report of all customers who currently owe money.'
              : 'Select a date range for the received payments report.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
          <div className="py-4 flex flex-col items-center">
            {reportType === 'pending' && (
              <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                <p>Select an &quot;As of&quot; date.</p>
                <p className="text-xs">Leave empty for today (current balance).</p>
              </div>
            )}
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

        <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleDownload('pdf')}
            disabled={reportType === 'received' && !dateRange?.from}
          >
            <FileText className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload('xlsx')}
            disabled={reportType === 'received' && !dateRange?.from}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
