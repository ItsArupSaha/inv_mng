'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { Download } from 'lucide-react';
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
import { downloadPurchasesPdf, downloadPurchasesXlsx } from './purchases-export-utils';

interface DownloadPurchasesDialogProps {
  userId: string;
  authUser: any;
}

export function DownloadPurchasesDialog({ userId, authUser }: DownloadPurchasesDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  const handleDownloadPdf = async () => {
    if (!dateRange) return;
    setIsOpen(false);
    await downloadPurchasesPdf(userId, dateRange, authUser);
  };

  const handleDownloadXlsx = async () => {
    if (!dateRange) return;
    setIsOpen(false);
    await downloadPurchasesXlsx(userId, dateRange);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Download Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Purchase Report</DialogTitle>
          <DialogDescription>Select a date range to download your purchase data.</DialogDescription>
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
            PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}>
            Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
