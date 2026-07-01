'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '../ui/scroll-area';
import type { Item } from '@/lib/types';

interface SalesDirectorySearchProps {
  items: Item[];
}

export function SalesDirectorySearch({ items }: SalesDirectorySearchProps) {
  const [directoryQuery, setDirectoryQuery] = React.useState('');

  const filteredDirectoryItems = React.useMemo(() => {
    const q = directoryQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 8);

    const matches = items.filter(
      (item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.medicineGroup || '').toLowerCase().includes(q) ||
        (item.company || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q)
    );

    const getRelevanceScore = (item: Item) => {
      const title = (item.title || '').toLowerCase();
      const group = (item.medicineGroup || '').toLowerCase();
      const company = (item.company || '').toLowerCase();
      const location = (item.location || '').toLowerCase();

      if (title.startsWith(q)) return 1;
      if (title.includes(q)) return 2;
      if (group.startsWith(q)) return 3;
      if (group.includes(q)) return 4;
      if (company.startsWith(q)) return 5;
      if (company.includes(q)) return 6;
      if (location.includes(q)) return 7;
      return 8;
    };

    return matches
      .sort((a, b) => {
        const scoreA = getRelevanceScore(a);
        const scoreB = getRelevanceScore(b);
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, 50);
  }, [directoryQuery, items]);

  return (
    <Card className="xl:col-span-1 w-full h-fit sticky top-20">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-lg flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Directory Deep Search
        </CardTitle>
        <CardDescription className="text-xs">
          Search medicines by name, company, generic group, or shelf.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type to search directory..."
            className="pl-8 w-full h-9 text-xs"
            value={directoryQuery}
            onChange={(e) => setDirectoryQuery(e.target.value)}
          />
          {directoryQuery && (
            <button
              onClick={() => setDirectoryQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ScrollArea className="h-[520px] pr-2">
          <div className="space-y-2">
            {filteredDirectoryItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No matching medicines found.</p>
            ) : (
              filteredDirectoryItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 border rounded-lg bg-card/40 hover:bg-card/85 transition-all duration-200 space-y-1.5 text-xs"
                >
                  <div className="flex justify-between items-start gap-1">
                    <div className="font-bold text-foreground truncate flex-1" title={item.title}>
                      {item.title}
                    </div>
                    <div className="font-bold text-primary shrink-0">৳{Number(item.sellingPrice).toFixed(2)}</div>
                  </div>

                  <div className="text-[10px] text-muted-foreground leading-tight truncate">
                    {item.company} {item.medicineGroup ? ` • ${item.medicineGroup}` : ''}
                  </div>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        item.stock <= 5
                          ? 'bg-destructive/15 text-destructive animate-pulse'
                          : item.stock <= 20
                          ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-emerald-500/15 text-emerald-600'
                      }`}
                    >
                      Stock: {item.stock}
                    </span>

                    {item.location && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-semibold truncate max-w-[120px]">
                        Shelf: {item.location}
                      </span>
                    )}

                    {item.expiryDate && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? 'bg-destructive/20 text-destructive animate-pulse'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        Exp: {item.expiryDate}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
