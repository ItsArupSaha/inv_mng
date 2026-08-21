'use client';

import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ScheduledRegisterRow } from '@/lib/scheduled-register';

interface ExportUser {
  companyName?: string | null;
  address?: string | null;
  phone?: string | null;
}

export function exportScheduledRegisterPdf(
  rows: ScheduledRegisterRow[],
  authUser: ExportUser | null,
  rangeLabel: string
) {
  if (!rows.length || !authUser) return;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(authUser.companyName || 'Pharmacy', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(authUser.address || '', 14, 26);
  doc.text(authUser.phone || '', 14, 32);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Narcotics & Controlled Medicines Register', 14, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(rangeLabel, 14, 48);
  doc.text(`Generated ${format(new Date(), 'PPP')}`, 200, 48, { align: 'right' });

  autoTable(doc, {
    startY: 54,
    head: [['Date', 'Invoice', 'Medicine', 'Schedule', 'Qty', 'Buyer', 'Prescription Ref']],
    body: rows.map((row) => [
      format(new Date(row.date), 'dd MMM yyyy'),
      row.saleId,
      row.medicine,
      row.schedule === 'narcotic' ? 'Narcotic' : 'Controlled',
      row.quantity,
      row.customer,
      row.prescriptionRef,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8 },
  });

  doc.save(`narcotics-register-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportScheduledRegisterExcel(rows: ScheduledRegisterRow[], rangeLabel: string) {
  if (!rows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      Date: format(new Date(row.date), 'dd MMM yyyy'),
      Invoice: row.saleId,
      Medicine: row.medicine,
      Schedule: row.schedule === 'narcotic' ? 'Narcotic' : 'Controlled',
      Quantity: row.quantity,
      Buyer: row.customer,
      'Prescription Ref': row.prescriptionRef,
    }))
  );
  worksheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 24 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scheduled Register');
  XLSX.writeFile(workbook, `narcotics-register-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  void rangeLabel;
}
