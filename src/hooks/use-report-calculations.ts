'use client';

import * as React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ReportFormValues } from './use-report-generator';

interface UseReportCalculationsProps {
  authUser: any;
  form: UseFormReturn<ReportFormValues>;
}

export function useReportCalculations({ authUser, form }: UseReportCalculationsProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Get the company creation date
  const companyCreatedAt = authUser?.createdAt
    ? authUser.createdAt.toDate
      ? authUser.createdAt.toDate()
      : new Date(authUser.createdAt)
    : new Date();
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
    years,
    months,
  };
}
