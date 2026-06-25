'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import {
  getAuthorityPresentationReport,
  type AuthorityPresentationReport as AuthorityReportData,
} from '@/lib/db/authority-presentation-report';
import { exportAuthorityReportPdf } from '@/components/authority/authority-export-utils';

interface UseAuthorityPresentationReportProps {
  userId: string;
}

export function useAuthorityPresentationReport({ userId }: UseAuthorityPresentationReportProps) {
  const { authUser } = useAuth();
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<AuthorityReportData | null>(null);

  const runReport = async () => {
    if (!startDate || !endDate) {
      setError('Choose both a start date and an end date.');
      return;
    }
    setError(null);
    setLoading(true);
    setReport(null);
    const startYmd = format(startDate, 'yyyy-MM-dd');
    const endYmd = format(endDate, 'yyyy-MM-dd');
    const res = await getAuthorityPresentationReport(userId, startYmd, endYmd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReport(res.data);
  };

  const handleDownloadPdf = () => {
    if (!authUser || !report || !startDate || !endDate) return;
    exportAuthorityReportPdf(report, startDate, endDate, authUser);
  };

  return {
    authUser,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    loading,
    error,
    setError,
    report,
    runReport,
    handleDownloadPdf,
  };
}
