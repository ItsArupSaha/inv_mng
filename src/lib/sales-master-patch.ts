import type { Sale } from './types';

// Level-1 incremental sync for the sales master cache: a mutation already
// holds the exact document it just wrote, so it patches the in-memory list
// instead of dropping it. Patches are upsert/remove-by-id — idempotent set
// operations — so applying one twice, or on top of a concurrently refetched
// list, can never corrupt data. If a patch misses, the version guard simply
// triggers an honest full refetch: the failure mode is extra reads, never
// wrong numbers.

export type SalesMasterPatch =
  | { kind: 'upsert'; sale: Sale }
  | { kind: 'remove'; saleId: string };

/** Replaces the sale by id, or inserts it keeping date-descending order. */
export function upsertSaleMaster(sales: Sale[], sale: Sale): Sale[] {
  const withoutExisting = sales.filter((s) => s.id !== sale.id);
  const saleTime = new Date(sale.date).getTime();
  let insertAt = withoutExisting.length;
  for (let i = 0; i < withoutExisting.length; i++) {
    if (new Date(withoutExisting[i].date).getTime() < saleTime) {
      insertAt = i;
      break;
    }
  }
  const next = [...withoutExisting];
  next.splice(insertAt, 0, sale);
  return next;
}

/** Drops the sale by id; returns the list unchanged when absent. */
export function removeSaleMaster(sales: Sale[], saleId: string): Sale[] {
  return sales.filter((s) => s.id !== saleId);
}

export function applySalesMasterPatch(sales: Sale[], patch: SalesMasterPatch): Sale[] {
  if (patch.kind === 'remove') return removeSaleMaster(sales, patch.saleId);
  return upsertSaleMaster(sales, patch.sale);
}
