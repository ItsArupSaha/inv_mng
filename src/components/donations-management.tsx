'use client';

import * as React from 'react';
import { Loader2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDonationsManagement } from '@/hooks/use-donations-management';
import { RecordDonationDialog } from './donations/record-donation-dialog';
import { DonationsTable } from './donations/donations-table';
import { DonationsReportDialog } from './donations/donations-report-dialog';

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
            <DonationsReportDialog
              isOpen={isDownloadDialogOpen}
              onOpenChange={setIsDownloadDialogOpen}
              dateRange={dateRange}
              setDateRange={setDateRange}
              handleDownloadPdf={handleDownloadPdf}
              handleDownloadXlsx={handleDownloadXlsx}
            />
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
