'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import * as React from 'react';
import ReportPreview from './report-preview';
import { useReportGenerator } from '@/hooks/use-report-generator';
import { cn } from '@/lib/utils';

interface ReportGeneratorProps {
  userId: string;
}

export default function ReportGenerator({ userId }: ReportGeneratorProps) {
  const {
    isLoading,
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
              : 'Select a month and year to generate an automated profit-loss report.'}
            {' '}Profit is calculated only from paid sales and partial payments received in the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportType === 'daily' ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Select Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start border-muted text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {date ? format(date, 'PPP') : 'As of Today'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) setDate(newDate);
                    }}
                    disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                    initialFocus
                  />
                  {date && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => setDate(new Date())}
                      >
                        Reset to Today
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Month</label>
                <Select onValueChange={setMonth} value={month}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a month" />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                      {months.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Year</label>
                <Select onValueChange={setYear} value={year}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a year" />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                      {years.map(y => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isGenerating && (
        <Card className="max-w-4xl mx-auto animate-pulse">
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
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
              : `${months.find(m => m.value === month)?.label || ''} ${year}`
          }
        />
      )}
    </div>
  );
}
