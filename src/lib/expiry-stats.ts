// Labels for the expiry alert filters, shared by the page header and exports.

export const EXPIRY_FILTER_LABELS: Record<string, string> = {
  expired: 'Expired',
  expiringSoon: 'Expiring within 30 days',
  expiring30d: 'Expiring within 30 days',
  expiring60d: 'Expiring within 60 days',
  expiring90d: 'Expiring within 90 days',
  all: 'All expiry dates',
};

export function expiryFilterLabel(statusFilter: string): string {
  return EXPIRY_FILTER_LABELS[statusFilter] || 'Expiry Report';
}
