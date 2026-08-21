import type { Customer, Item, Sale } from './types';

export type ScheduledRegisterRow = {
  date: string;
  saleId: string;
  medicine: string;
  schedule: 'narcotic' | 'controlled';
  quantity: number;
  customer: string;
  prescriptionRef: string;
};

/**
 * Builds narcotics/controlled-medicine register rows from a set of sales.
 * One row per scheduled sale line — the layout DGDA inspectors expect for the
 * narcotics register: date, invoice, medicine, quantity, buyer, prescription
 * reference. Pure so it can be unit-tested against the exact grouping rules.
 */
export function buildScheduledRegisterRows(
  sales: Sale[],
  itemsById: Map<string, Item>,
  customersById: Map<string, Customer>
): ScheduledRegisterRow[] {
  const rows: ScheduledRegisterRow[] = [];

  for (const sale of [...sales].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const line of sale.items) {
      const item = itemsById.get(line.itemId);
      if (!item?.schedule) continue;

      rows.push({
        date: sale.date,
        saleId: sale.saleId,
        medicine: item.title,
        schedule: item.schedule,
        quantity: Number(line.quantity) || 0,
        customer: customersById.get(sale.customerId)?.name || 'Unknown Customer',
        prescriptionRef: sale.prescriptionRef || '',
      });
    }
  }

  return rows;
}
