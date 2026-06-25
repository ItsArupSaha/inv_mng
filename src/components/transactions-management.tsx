'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

import { AddTransactionDialog } from './transactions/add-transaction-dialog';
import { TransactionsTable } from './transactions/transactions-table';
import { PaidPayablesTable } from './transactions/paid-payables-table';
import { useTransactionsManagement } from '@/hooks/use-transactions-management';

interface TransactionsManagementProps {
  title: string;
  description: string;
  type: 'Payable';
  userId: string;
}

export default function TransactionsManagement({
  title,
  description,
  type,
  userId,
}: TransactionsManagementProps) {
  const {
    authUser,
    transactions,
    paidPayables,
    hasMore,
    isInitialLoading,
    isLoadingPaid,
    isLoadingMore,
    isDialogOpen,
    setIsDialogOpen,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    asOfDate,
    setAsOfDate,
    dateRange,
    setDateRange,
    reportType,
    setReportType,
    handleLoadMore,
    form,
    handleAddNew,
    onSubmit,
    handleMarkAsPaid,
    handleDownload,
    isPending
  } = useTransactionsManagement({ userId, type });

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New {type}
              </Button>

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
                        : 'Select a date range (e.g., monthly/quarterly) for paid payables.'}
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
                          <p className="text-xs">E.g., monthly, quarterly, or custom period.</p>
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
          <TransactionsTable
            transactions={transactions}
            isLoading={isInitialLoading}
            onMarkAsPaid={handleMarkAsPaid}
            isPending={isPending}
            type={type}
          />
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
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
            <h3 className="text-lg font-semibold font-headline mb-2">Paid Payables</h3>
            <p className="text-sm text-muted-foreground">All payables that have been marked as paid</p>
          </div>
          <PaidPayablesTable paidPayables={paidPayables} isLoading={isLoadingPaid} />
        </CardContent>
      </Card>

      <AddTransactionDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={isPending}
        type={type}
      />
    </>
  );
}
