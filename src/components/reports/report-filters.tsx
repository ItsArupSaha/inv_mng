'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface ReportFiltersProps {
  reportType: 'monthly' | 'daily';
  date: Date;
  setDate: (date: Date) => void;
  month: string;
  setMonth: (month: string) => void;
  year: string;
  setYear: (year: string) => void;
  months: { value: string; label: string }[];
  years: string[];
}

export function ReportFilters({
  reportType,
  date,
  setDate,
  month,
  setMonth,
  year,
  setYear,
  months,
  years,
}: ReportFiltersProps) {
  return (
    <>
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
                disabled={(d) => d > new Date() || d < new Date('1900-01-01')}
                initialFocus
              />
              {date && (
                <div className="p-3 border-t">
                  <Button variant="outline" className="w-full text-xs" onClick={() => setDate(new Date())}>
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
              <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Year</label>
            <Select onValueChange={setYear} value={year}>
              <SelectTrigger>
                <SelectValue placeholder="Select a year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </>
  );
}
