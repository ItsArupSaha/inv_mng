
/**
 * Links an expense or payable document back to its purchase. Every doc the
 * purchase pipeline writes carries `purchaseId`; older docs only encode it in
 * one of a handful of machine-generated description templates. The PUR number
 * pins the purchase, so any supplier suffix is accepted.
 */
export interface LedgerDocLike {
  purchaseId?: string;
  description?: string;
}

const LEGACY_EXACT_DESCRIPTIONS = (pid: string): string[] => [
  `Payment for Purchase ${pid}`,
  `Partial payment for Purchase ${pid}`,
];

const LEGACY_DESCRIPTION_PREFIXES = (pid: string): string[] => [
  `Purchase ${pid} from `,
  `Balance for Purchase ${pid} from `,
  `Paid Payable: Purchase ${pid} from `,
  `Paid Payable: Balance for Purchase ${pid} from `,
];

export function ledgerDocMatchesPurchase(doc: LedgerDocLike, pid: string): boolean {
  if (doc.purchaseId === pid) return true;
  const description = (doc.description || '').trim();
  if (!description) return false;
  if (LEGACY_EXACT_DESCRIPTIONS(pid).includes(description)) return true;
  return LEGACY_DESCRIPTION_PREFIXES(pid).some(prefix => description.startsWith(prefix));
}
