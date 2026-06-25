'use client';

import * as React from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  PendingPayablesTable,
  CustomerOverpaymentsTable,
  PaidHistoryTable,
} from './payables/payables-list-tables';
import { usePayablesManagement } from '@/hooks/use-payables-management';

interface PayablesManagementProps {
  userId: string;
}

export default function PayablesManagement({ userId }: PayablesManagementProps) {
  const {
    authUser,
    payables,
    hasMorePayables,
    isInitialLoadingPayables,
    isLoadingMorePayables,
    overpaidCustomers,
    isLoadingCustomers,
    paidPayables,
    isLoadingPaid,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    asOfDate,
    setAsOfDate,
    dateRange,
    setDateRange,
    reportType,
    setReportType,
    loadAllData,
    handleLoadMorePayables,
    handleDownload
  } = usePayablesManagement(userId);

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Track Payables</CardTitle>
              <CardDescription>Manage bills, supplier payments, and customer refunds.</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold font-headline">Pending Payables</h3>
            </div>
            <PendingPayablesTable
              payables={payables}
              isLoading={isInitialLoadingPayables}
              userId={userId}
              onPaymentSuccess={loadAllData}
            />
            {hasMorePayables && payables.length > 0 && (
              <div className="flex justify-center mt-4">
                <Button onClick={handleLoadMorePayables} disabled={isLoadingMorePayables}>
                  {isLoadingMorePayables ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    'Load More Payables'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Customer Overpayments Section */}
          <div className="border-t pt-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold font-headline text-emerald-600 mb-2">Customer Overpayments</h3>
                <p className="text-sm text-muted-foreground">
                  Customers who paid more than they owed. You owe them this amount.
                </p>
              </div>
            </div>
            <CustomerOverpaymentsTable
              overpaidCustomers={overpaidCustomers}
              isLoading={isLoadingCustomers}
              userId={userId}
              onRefundSuccess={loadAllData}
            />
          </div>

          {/* Paid Payables Section */}
          <div className="border-t pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold font-headline mb-2">Paid History</h3>
              <p className="text-sm text-muted-foreground">
                History of completed and partial payments towards your payables.
              </p>
            </div>
            <PaidHistoryTable paidPayables={paidPayables} isLoading={isLoadingPaid} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
