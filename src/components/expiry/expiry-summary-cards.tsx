'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExpiryTier, ExpiryTierSummary } from '@/lib/expiry-stats';
import { cn } from '@/lib/utils';

interface ExpirySummaryCardsProps {
  summary: Record<ExpiryTier, ExpiryTierSummary>;
  isLoading: boolean;
}

const TIER_STYLES: Record<ExpiryTier, { label: string; card: string; value: string }> = {
  expired: {
    label: 'Expired',
    card: 'border-destructive/40 bg-destructive/5',
    value: 'text-destructive',
  },
  within30d: {
    label: 'Within 30 days',
    card: 'border-amber-500/40 bg-amber-500/5',
    value: 'text-amber-600 dark:text-amber-400',
  },
  within60d: {
    label: 'Within 60 days',
    card: 'border-yellow-500/30 bg-yellow-500/5',
    value: 'text-yellow-600 dark:text-yellow-400',
  },
  within90d: {
    label: 'Within 90 days',
    card: 'border-muted',
    value: 'text-foreground',
  },
};

export function ExpirySummaryCards({ summary, isLoading }: ExpirySummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-6 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
      {(Object.keys(TIER_STYLES) as ExpiryTier[]).map(tier => {
        const style = TIER_STYLES[tier];
        const tierSummary = summary[tier];
        return (
          <Card key={tier} className={cn('p-4', style.card)}>
            <CardContent className="p-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{style.label}</p>
              <p className={cn('text-lg font-bold', style.value)}>
                ৳{tierSummary.value.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {tierSummary.count} medicine{tierSummary.count === 1 ? '' : 's'} at risk
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
