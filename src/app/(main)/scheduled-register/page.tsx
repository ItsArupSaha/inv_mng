'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarRange, Download, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getScheduledRegister } from '@/lib/db/narcotics-register';
import { ScheduledRegisterTable } from '@/components/scheduled-register/scheduled-register-table';
import {
  exportScheduledRegisterExcel,
  exportScheduledRegisterPdf,
} from '@/components/scheduled-register/scheduled-register-export-utils';

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export default function ScheduledRegisterPage() {
  const { user, authUser } = useAuth();
  const [startDate, setStartDate] = React.useState<Date>(monthStart(new Date()));
  const [endDate, setEndDate] = React.useState<Date>(endOfDay(new Date()));
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof getScheduledRegister>> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    getScheduledRegister(user.uid, startDate, endDate)
      .then(setRows)
      .catch((err) => {
        console.error('Failed to load scheduled register:', err);
        setRows([]);
      })
      .finally(() => setIsLoading(false));
  }, [user, startDate, endDate]);

  const rangeLabel = `${format(startDate, 'dd MMM yyyy')} — ${format(endDate, 'dd MMM yyyy')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Scheduled Register</h1>
          <p className="text-sm text-muted-foreground">
            Narcotics &amp; controlled medicine sales with prescription references (DGDA register).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!rows?.length}
            onClick={() => exportScheduledRegisterPdf(rows || [], authUser, rangeLabel)}
          >
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!rows?.length}
            onClick={() => exportScheduledRegisterExcel(rows || [], rangeLabel)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" /> Period
          </CardTitle>
          <CardDescription>Default: current month. Adjust to inspect any period.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="register-start">From</label>
            <input
              id="register-start"
              type="date"
              className="border rounded-md px-3 py-1.5 text-sm"
              value={format(startDate, 'yyyy-MM-dd')}
              max={format(endDate, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setStartDate(new Date(`${e.target.value}T00:00:00`))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="register-end">To</label>
            <input
              id="register-end"
              type="date"
              className="border rounded-md px-3 py-1.5 text-sm"
              value={format(endDate, 'yyyy-MM-dd')}
              min={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setEndDate(endOfDay(new Date(`${e.target.value}T00:00:00`)))}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading || !rows ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <ShieldAlert className="h-8 w-8" />
            <p className="text-sm">No scheduled medicine sales recorded for {rangeLabel}.</p>
          </CardContent>
        </Card>
      ) : (
        <ScheduledRegisterTable rows={rows} />
      )}
    </div>
  );
}
