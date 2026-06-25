'use client';

import * as React from 'react';
import { DollarSign, FileSpreadsheet, FileText, Loader2, MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from './ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import ReceivePaymentDialog from './receive-payment-dialog';

import {
  PendingReceivablesTable,
  ReceivedPaymentsTable,
} from './receivables/receivables-list-tables';
import { useReceivablesManagement } from '@/hooks/use-receivables-management';

interface ReceivablesManagementProps {
  userId: string;
}

export default function ReceivablesManagement({ userId }: ReceivablesManagementProps) {
  const {
    customers,
    receivedPayments,
    hasMore,
    isInitialLoading,
    isLoadingReceived,
    isLoadingMore,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    dateRange,
    setDateRange,
    reportType,
    setReportType,
    loadInitialData,
    loadReceivedPayments,
    handleLoadMore,
    handleDownload,
  } = useReceivablesManagement({ userId });

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Pending Receivables</CardTitle>
            <CardDescription>A list of all customers with an outstanding balance.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <ReceivePaymentDialog
              userId={userId}
              onPaymentReceived={() => {
                loadInitialData();
                loadReceivedPayments();
              }}
            >
              <Button>
                <DollarSign className="mr-2 h-4 w-4" /> Receive Payment
              </Button>
            </ReceivePaymentDialog>

            <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PendingReceivablesTable customers={customers} isLoading={isInitialLoading} />
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
      <CardContent className="border-t pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold font-headline mb-2">Received Payments</h3>
          <p className="text-sm text-muted-foreground">All payments received from the start of the company</p>
        </div>
        <ReceivedPaymentsTable receivedPayments={receivedPayments} isLoading={isLoadingReceived} />
      </CardContent>
    </Card>
  );
}

