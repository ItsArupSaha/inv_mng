'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScheduledRegisterRow } from '@/lib/scheduled-register';

export function ScheduledRegisterTable({ rows }: { rows: ScheduledRegisterRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Medicine</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Buyer</TableHead>
            <TableHead>Prescription Ref</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No scheduled medicines were sold in this period.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={`${row.saleId}-${index}`}>
                <TableCell>{format(new Date(row.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="font-medium">{row.saleId}</TableCell>
                <TableCell>{row.medicine}</TableCell>
                <TableCell>
                  <Badge variant={row.schedule === 'narcotic' ? 'destructive' : 'secondary'}>
                    {row.schedule === 'narcotic' ? 'Narcotic' : 'Controlled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{row.quantity}</TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell className="font-mono text-xs">{row.prescriptionRef || '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
