'use client';

import * as React from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DonationsReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  handleDownloadPdf: () => void;
  handleDownloadXlsx: () => void;
}

export function DonationsReportDialog({
  isOpen,
  onOpenChange,
  dateRange,
  setDateRange,
  handleDownloadPdf,
  handleDownloadXlsx,
}: DonationsReportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Download Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Donations Report</DialogTitle>
          <DialogDescription>
            Select a date range to download your donation data.
          </DialogDescription>
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
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}>
            <FileText className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
