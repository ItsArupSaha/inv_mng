'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getDonationsForMonth,
  getExpensesForMonth,
  getItems,
  getSalesForMonth,
  getTransactionsForMonth,
  getSalesForDay,
  getExpensesForDay,
  getDonationsForDay,
  getTransactionsForDay,
} from '@/lib/actions';
import {
  generateMonthlyReport,
  generateDailyReport,
  type ReportAnalysis,
  type DailyReportAnalysis,
} from '@/lib/report-generator';
import type { Item } from '@/lib/types';
import { useReportCalculations } from './use-report-calculations';

interface ReportDataSource {
  items: Item[];
}

interface UseReportGeneratorProps {
  userId: string;
}

export function useReportGenerator({ userId }: UseReportGeneratorProps) {
  const [dataSource, setDataSource] = React.useState<ReportDataSource | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportAnalysis | DailyReportAnalysis | null>(null);

  const [reportType, setReportType] = React.useState<'monthly' | 'daily'>('daily');
  const [date, setDate] = React.useState<Date>(new Date());
  const [month, setMonth] = React.useState<string>(new Date().getMonth().toString());
  const [year, setYear] = React.useState<string>(new Date().getFullYear().toString());

  const { toast } = useToast();
  const { authUser } = useAuth();

  React.useEffect(() => {
    async function loadData() {
      if (!userId) return;
      setIsLoading(true);
      try {
        const items = await getItems(userId);
        setDataSource({ items });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: 'Could not fetch the necessary data for reports. Please try again later.',
        });
        console.error('Failed to load report data sources:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userId, toast]);

  React.useEffect(() => {
    async function runReport() {
      if (!userId || !dataSource) return;
      setIsGenerating(true);
      setReportData(null);
      try {
        if (reportType === 'daily') {
          // Format as YYYY-MM-DD local date
          const offset = date.getTimezoneOffset();
          const localDate = new Date(date.getTime() - offset * 60 * 1000);
          const dateString = localDate.toISOString().split('T')[0];

          const [salesForDay, expensesForDay, donationsForDay, transactionsForDay] = await Promise.all([
            getSalesForDay(userId, dateString),
            getExpensesForDay(userId, dateString),
            getDonationsForDay(userId, dateString),
            getTransactionsForDay(userId, dateString)
          ]);

          const input = {
            salesData: salesForDay,
            expensesData: expensesForDay,
            donationsData: donationsForDay,
            itemsData: dataSource.items,
            date: dateString,
            transactionsData: transactionsForDay,
          };

          const result = generateDailyReport(input);
          setReportData(result);
        } else {
          const selectedMonth = parseInt(month, 10);
          const selectedYear = parseInt(year, 10);

          const [salesForMonth, expensesForMonth, donationsForMonth, transactionsForMonth] = await Promise.all([
            getSalesForMonth(userId, selectedYear, selectedMonth),
            getExpensesForMonth(userId, selectedYear, selectedMonth),
            getDonationsForMonth(userId, selectedYear, selectedMonth),
            getTransactionsForMonth(userId, selectedYear, selectedMonth)
          ]);

          const input = {
            salesData: salesForMonth,
            expensesData: expensesForMonth,
            donationsData: donationsForMonth,
            itemsData: dataSource.items,
            month: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' }),
            year: year,
            transactionsData: transactionsForMonth,
          };

          const result = generateMonthlyReport(input);
          setReportData(result);
        }
      } catch (error) {
        console.error('Error generating report:', error);
        toast({
          variant: 'destructive',
          title: 'Error generating report',
          description: 'There was a problem loading database values for this period.'
        });
      } finally {
        setIsGenerating(false);
      }
    }

    runReport();
  }, [userId, dataSource, reportType, date, month, year, toast]);

  // Call the report date options calculator hook
  const calcs = useReportCalculations({ authUser, selectedYear: year });

  return {
    dataSource,
    isLoading,
    isGenerating,
    reportData,
    setReportData,
    years: calcs.years,
    months: calcs.months,
    authUser,
    reportType,
    setReportType,
    date,
    setDate,
    month,
    setMonth,
    year,
    setYear,
  };
}
