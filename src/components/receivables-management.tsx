'use client';

import * as React from 'react';
import { DollarSign, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReceivePaymentDialog from './receive-payment-dialog';
import { ReceivablesReportDialog } from './receivables/receivables-report-dialog';

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

            <ReceivablesReportDialog
              isOpen={isDownloadDialogOpen}
              onOpenChange={setIsDownloadDialogOpen}
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
