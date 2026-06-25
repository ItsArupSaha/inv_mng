'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getDonationsForMonth, getExpensesForMonth, getItems, getSalesForMonth, getTransactionsForMonth } from '@/lib/actions';
import { generateMonthlyReport, type ReportAnalysis } from '@/lib/report-generator';
import type { Item } from '@/lib/types';

export const reportSchema = z.object({
  month: z.string({ required_error: 'Please select a month.' }),
  year: z.string({ required_error: 'Please select a year.' }),
});

export type ReportFormValues = z.infer<typeof reportSchema>;

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
  const [reportData, setReportData] = React.useState<ReportAnalysis | null>(null);
  const [formValues, setFormValues] = React.useState<ReportFormValues | null>(null);

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
          variant: "destructive",
          title: "Failed to load data",
          description: "Could not fetch the necessary data for reports. Please try again later.",
        });
        console.error("Failed to load report data sources:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userId, toast]);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit = async (formData: ReportFormValues) => {
    if (!dataSource) return;

    setIsGenerating(true);
    setReportData(null);
    setFormValues(formData);

    try {
      const selectedMonth = parseInt(formData.month, 10);
      const selectedYear = parseInt(formData.year, 10);

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
        year: formData.year,
        transactionsData: transactionsForMonth,
      };

      const result = generateMonthlyReport(input);

      if (result) {
        setReportData(result);
        toast({
          title: "Report Generated",
          description: "Your monthly report preview is ready below.",
        });
      } else {
        throw new Error("The AI model failed to return valid report data.");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `There was a problem generating your report. Error: ${errorMessage}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Get the company creation date
  const companyCreatedAt = authUser?.createdAt ?
    (authUser.createdAt.toDate ? authUser.createdAt.toDate() : new Date(authUser.createdAt)) :
    new Date();
  const companyStartYear = companyCreatedAt.getFullYear();
  const companyStartMonth = companyCreatedAt.getMonth();

  const startYear = Math.min(companyStartYear, currentYear);
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (currentYear - i).toString());

  // Watch the selected year to dynamically generate months
  const watchedYear = form.watch('year');
  const watchedYearNum = watchedYear ? parseInt(watchedYear, 10) : null;

  // Generate months based on selected year, company creation date and current month
  const months = React.useMemo(() => {
    const allMonths = Array.from({ length: 12 }, (_, i) => ({
      value: i.toString(),
      label: new Date(0, i).toLocaleString('default', { month: 'long' }),
    }));

    // If no year is selected yet, show months based on current year logic
    if (!watchedYearNum) {
      // If company was created this year, only show months from creation month to current month
      if (companyStartYear === currentYear) {
        return allMonths.slice(companyStartMonth, currentMonth + 1);
      }
      return allMonths.slice(0, currentMonth + 1);
    }

    // If selected year is the company start year and also the current year
    if (watchedYearNum === companyStartYear && watchedYearNum === currentYear) {
      return allMonths.slice(companyStartMonth, currentMonth + 1);
    }

    // If selected year is company start year
    if (watchedYearNum === companyStartYear) {
      return allMonths.slice(companyStartMonth);
    }

    // If selected year is current year
    if (watchedYearNum === currentYear) {
      return allMonths.slice(0, currentMonth + 1);
    }

    return allMonths;
  }, [watchedYearNum, companyStartYear, companyStartMonth, currentYear, currentMonth]);

  return {
    dataSource,
    isLoading,
    isGenerating,
    reportData,
    setReportData,
    formValues,
    form,
    onSubmit,
    years,
    months,
    authUser,
  };
}
