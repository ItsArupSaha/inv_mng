'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Item } from '@/lib/types';

interface AlternativeMedicinesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAlternativeItem: Item | null;
  alternativeMedicines: Item[];
}

export function AlternativeMedicinesDialog({
  isOpen,
  onOpenChange,
  selectedAlternativeItem,
  alternativeMedicines,
}: AlternativeMedicinesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-lg flex items-center gap-2">
            Alternative Medicines
          </DialogTitle>
          <DialogDescription className="text-xs">
            Available brands for generic group:{' '}
            <span className="font-semibold text-foreground">
              {selectedAlternativeItem?.medicineGroup}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {alternativeMedicines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No alternative medicines found in this generic group.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {alternativeMedicines.map((alt) => (
                <div
                  key={alt.id}
                  className="p-3 border rounded-lg flex items-center justify-between gap-3 text-xs bg-muted/20"
                >
                  <div>
                    <span className="block font-semibold text-foreground">{alt.title}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {alt.company || 'Unknown Company'}
                    </span>
                    {alt.location && (
                      <span className="inline-block mt-1 text-[9px] bg-primary/10 text-primary px-1 rounded font-medium">
                        Shelf: {alt.location}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="block font-bold text-foreground">
                      ৳{Number(alt.sellingPrice).toFixed(2)}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[9px] px-1 font-semibold',
                        alt.stock === 0
                          ? 'bg-red-100 text-red-800 animate-pulse'
                          : alt.stock <= 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      Stock: {alt.stock}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
