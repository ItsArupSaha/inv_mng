'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayablesReportDialog } from './payables/payables-report-dialog';

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
    handleDownload,
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
              <PayablesReportDialog
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
