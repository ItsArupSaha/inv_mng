'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import type { ReportAnalysis, DailyReportAnalysis } from '@/lib/report-generator';
import { Download } from 'lucide-react';
import { ReportActivityTable } from './reports/report-activity-table';
import { ReportCashflowOverview } from './reports/report-cashflow-overview';
import { ReportPurchasesTable } from './reports/report-purchases-table';
import { ReportTopSellers } from './reports/report-top-sellers';
import { generateReportPdf } from './reports/report-pdf-generator';

interface ReportPreviewProps {
  reportData: ReportAnalysis | DailyReportAnalysis;
  reportType: 'monthly' | 'daily';
  dateLabel: string;
}

const formatCurrency = (amount: number) => {
  return `BDT ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

export default function ReportPreview({ reportData, reportType, dateLabel }: ReportPreviewProps) {
  const { authUser } = useAuth();

  const activity =
    reportType === 'daily'
      ? (reportData as DailyReportAnalysis).dailyActivity
      : (reportData as ReportAnalysis).monthlyActivity;

  const { salesBreakdown, cashFlow, netResult, purchases, topSellers } = reportData ?? ({} as Partial<ReportAnalysis>);

  // A report payload that doesn't match the selected type (e.g. a daily
  // analysis rendered while the monthly branch is active) must never reach
  // the tables — every child reads fields like activity.totalSales directly.
  if (!activity || !netResult || !salesBreakdown || !cashFlow) {
    return null;
  }

  const handleDownload = () => {
    generateReportPdf({ reportData, reportType, dateLabel, authUser });
  };

  const netColor = netResult.netProfitOrLoss >= 0 ? 'text-primary' : 'text-destructive';

  return (
    <Card className="max-w-4xl mx-auto animate-in fade-in-50">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <CardTitle className="font-headline text-2xl">Financial Report</CardTitle>
          <CardDescription>Showing results for {dateLabel}</CardDescription>
        </div>
        <Button onClick={handleDownload} variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ReportActivityTable
              activity={activity}
              formatCurrency={formatCurrency}
              title={reportType === 'daily' ? 'Daily Activity' : 'Monthly Activity'}
            />
            <ReportPurchasesTable purchases={purchases} formatCurrency={formatCurrency} />
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 font-headline">
                {reportType === 'daily' ? `Net Result for ${dateLabel}` : `Net Result for ${dateLabel}`}
              </h3>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Net Profit / Loss</p>
                <p className={`text-3xl font-bold ${netColor}`}>{formatCurrency(netResult.netProfitOrLoss)}</p>
              </div>
            </div>
            <ReportCashflowOverview
              salesBreakdown={salesBreakdown}
              cashFlow={cashFlow}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>

        <ReportTopSellers topSellers={topSellers} formatCurrency={formatCurrency} />
      </CardContent>
    </Card>
  );
}
