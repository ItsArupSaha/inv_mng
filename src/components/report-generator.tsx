'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import ReportPreview from './report-preview';
import { useReportGenerator } from '@/hooks/use-report-generator';

interface ReportGeneratorProps {
  userId: string;
}

export default function ReportGenerator({ userId }: ReportGeneratorProps) {
  const {
    isLoading,
    isGenerating,
    reportData,
    formValues,
    form,
    onSubmit,
    years,
    months,
  } = useReportGenerator({ userId });

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto animate-in fade-in-50">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Monthly Report Generator</CardTitle>
          <CardDescription>
            Select a month and year to generate an automated profit-loss report.
            Profit is calculated only from paid sales and partial payments received in the selected month.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectPortal>
                          <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectPortal>
                          <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || isGenerating}>
                {(isLoading || isGenerating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Loading Data...' : isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardFooter>
          </form>
        </Form>
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

      {reportData && formValues && (
        <ReportPreview
          reportData={reportData}
          month={months.find(m => m.value === formValues.month)?.label || new Date(0, parseInt(formValues.month, 10)).toLocaleString('default', { month: 'long' })}
          year={formValues.year}
        />
      )}
    </div>
  );
}
