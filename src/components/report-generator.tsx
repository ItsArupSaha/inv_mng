'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReportPreview from './report-preview';
import { useReportGenerator } from '@/hooks/use-report-generator';
import { ReportFilters } from './reports/report-filters';

interface ReportGeneratorProps {
  userId: string;
}

export default function ReportGenerator({ userId }: ReportGeneratorProps) {
  const {
    isGenerating,
    reportData,
    years,
    months,
    reportType,
    setReportType,
    date,
    setDate,
    month,
    setMonth,
    year,
    setYear,
  } = useReportGenerator({ userId });

  return (
    <div className="space-y-6">
      {/* Switcher Toggle System (POS-style button toggles) */}
      <div className="flex gap-2 justify-center max-w-2xl mx-auto border-b pb-4">
        <Button
          type="button"
          variant={reportType === 'daily' ? 'default' : 'outline'}
          onClick={() => setReportType('daily')}
          className="flex-1"
        >
          Daily Report
        </Button>
        <Button
          type="button"
          variant={reportType === 'monthly' ? 'default' : 'outline'}
          onClick={() => setReportType('monthly')}
          className="flex-1"
        >
          Monthly Report
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto animate-in fade-in-50">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            {reportType === 'daily' ? 'Daily Report' : 'Monthly Report'}
          </CardTitle>
          <CardDescription>
            {reportType === 'daily'
              ? 'Select a date to generate an automated daily profit-loss report. Defaults to today.'
              : 'Select a month and year to generate an automated profit-loss report.'}{' '}
            Profit is calculated only from paid sales and partial payments received in the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReportFilters
            reportType={reportType}
            date={date}
            setDate={setDate}
            month={month}
            setMonth={setMonth}
            year={year}
            setYear={setYear}
            months={months}
            years={years}
          />
        </CardContent>
      </Card>

      {isGenerating && (
        <Card className="max-w-4xl mx-auto animate-pulse">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {!isGenerating && reportData && (
        <ReportPreview
          reportData={reportData}
          reportType={reportType}
          dateLabel={
            reportType === 'daily'
              ? format(date, 'PPP')
              : `${months.find((m) => m.value === month)?.label || ''} ${year}`
          }
        />
      )}
    </div>
  );
}
