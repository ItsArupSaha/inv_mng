'use client';

import * as React from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useDonationsManagement } from '@/hooks/use-donations-management';
import { RecordDonationDialog } from './donations/record-donation-dialog';
import { DonationsTable } from './donations/donations-table';

interface DonationsManagementProps {
  userId: string;
}

export default function DonationsManagement({ userId }: DonationsManagementProps) {
  const {
    donations,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isDialogOpen,
    setIsDialogOpen,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    dateRange,
    setDateRange,
    form,
    isPending,
    handleLoadMore,
    handleAddNew,
    onSubmit,
    handleDownloadPdf,
    handleDownloadXlsx,
  } = useDonationsManagement({ userId });

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">Donations</CardTitle>
            <CardDescription>
              Record and view all donations received. Initial capital is not shown here.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Donation
            </Button>
            <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DonationsTable donations={donations} isLoading={isInitialLoading} />
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </CardContent>

      <RecordDonationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </Card>
  );
}
