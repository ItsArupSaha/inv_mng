// Categories that track owned equipment rather than sellable stock.
// Items in these categories are excluded from POS sales and stock warnings.
const NON_SALABLE_CATEGORIES = new Set(['assets', 'surgicals']);

export function isNonSalableCategory(categoryName?: string): boolean {
  if (!categoryName) return false;
  return NON_SALABLE_CATEGORIES.has(categoryName.trim().toLowerCase());
}

/**
 * Items written before the `isSalable` flag existed only carry a category
 * name; derive the flag from it. Defaults to salable.
 */
export function resolveIsSalable(item: { isSalable?: boolean; categoryName?: string }): boolean {
  if (typeof item.isSalable === 'boolean') return item.isSalable;
  return !isNonSalableCategory(item.categoryName);
}
