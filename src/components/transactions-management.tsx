'use client';

import * as React from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddTransactionDialog } from './transactions/add-transaction-dialog';
import { TransactionsTable } from './transactions/transactions-table';
import { PaidPayablesTable } from './transactions/paid-payables-table';
import { TransactionsReportDialog } from './transactions/transactions-report-dialog';
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
    isPending,
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

              <TransactionsReportDialog
                isOpen={isDownloadDialogOpen}
                onOpenChange={setIsDownloadDialogOpen}
                asOfDate={asOfDate}
                setAsOfDate={setAsOfDate}
                dateRange={dateRange}
                setDateRange={setDateRange}
                reportType={reportType}
                setReportType={setReportType}
                handleDownload={handleDownload}
              />
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
