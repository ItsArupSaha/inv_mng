import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ClosingStock } from '@/lib/types';

interface AuthUserProps {
  companyName?: string;
  address?: string;
  phone?: string;
  bkashNumber?: string;
  bankInfo?: string;
}

export function exportClosingStockPdf(
  closingStockData: ClosingStock[],
  closingStockDate: Date,
  authUser: AuthUserProps | null
) {
  if (!closingStockData.length || !closingStockDate || !authUser) return;

  const doc = new jsPDF();
  const dateString = format(closingStockDate, 'PPP');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(authUser.companyName || 'Pharmacy', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(authUser.address || '', 14, 26);
  doc.text(authUser.phone || '', 14, 32);

  let yPos = 20;
  if (authUser.bkashNumber) {
    doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
    yPos += 6;
  }
  if (authUser.bankInfo) {
    doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Closing Stock Report', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  const detailHeader = 'Group (Generic)';

  autoTable(doc, {
    startY: 60,
    head: [['Title', 'Category', detailHeader, 'Company', 'Expiry Date', 'Prod. Price (TK)', 'MRP (TK)', 'Stock']],
    body: closingStockData.map(item => [
      item.title,
      item.categoryName,
      item.medicineGroup || '-',
      item.company || '-',
      item.expiryDate || '-',
      item.productionPrice.toFixed(2),
      item.sellingPrice.toFixed(2),
      item.closingStock
    ]),
  });

  doc.save(`closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.pdf`);
}

export function exportClosingStockXlsx(
  closingStockData: ClosingStock[],
  closingStockDate: Date
) {
  if (!closingStockData.length || !closingStockDate) return;

  const detailHeader = 'Group (Generic)';

  const dataToExport = closingStockData.map(item => ({
    Title: item.title,
    Category: item.categoryName,
    [detailHeader]: item.medicineGroup || '-',
    Company: item.company || '-',
    'Expiry Date': item.expiryDate || '-',
    'Production Price': item.productionPrice,
    'MRP': item.sellingPrice,
    Stock: item.closingStock,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  const columnWidths = Object.keys(dataToExport[0]).map(key => {
    const maxLength = Math.max(
      ...dataToExport.map(row => String(row[key as keyof typeof row]).length),
      key.length
    );
    return { wch: maxLength + 2 };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Closing Stock');
  XLSX.writeFile(workbook, `closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.xlsx`);
}
