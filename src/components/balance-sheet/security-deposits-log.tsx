'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Edit, Trash2 } from 'lucide-react';
import type { SecurityDeposit } from '@/lib/types';

interface SecurityDepositsLogProps {
  securityHistory: SecurityDeposit[];
  onEditSecurity: (sec: SecurityDeposit) => void;
  onDeleteSecurity: (secId: string) => void;
}

export function SecurityDepositsLog({
  securityHistory,
  onEditSecurity,
  onDeleteSecurity,
}: SecurityDepositsLogProps) {
  return (
    <Card className="lg:col-span-2 border border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Security Deposit Log
        </CardTitle>
        <CardDescription>
          History of all refundable security deposits paid and their current status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-x-auto max-h-[220px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0">
              <TableRow>
                <TableHead className="py-2.5">Date</TableHead>
                <TableHead className="py-2.5">ID</TableHead>
                <TableHead className="py-2.5">Paid Via</TableHead>
                <TableHead className="py-2.5">Status</TableHead>
                <TableHead className="py-2.5">Notes</TableHead>
                <TableHead className="text-right py-2.5">Amount</TableHead>
                <TableHead className="text-right py-2.5 w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {securityHistory.length > 0 ? (
                securityHistory.map((sec) => (
                  <TableRow key={sec.id} className="hover:bg-muted/10">
                    <TableCell className="py-2 text-xs">
                      {format(new Date(sec.date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="py-2 text-xs font-semibold font-mono">
                      {sec.securityId}
                    </TableCell>
                    <TableCell className="py-2 text-xs font-medium">{sec.paymentMethod}</TableCell>
                    <TableCell className="py-2 text-xs">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          sec.status === 'Refundable'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {sec.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-xs max-w-[150px] truncate" title={sec.notes || ''}>
                      {sec.notes || '-'}
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold font-headline">
                      ৳{sec.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Edit security deposit"
                          onClick={() => onEditSecurity(sec)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          title="Delete security deposit"
                          onClick={() => onDeleteSecurity(sec.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-xs">
                    No security deposit records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
