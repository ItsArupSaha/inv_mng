'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isFuzzyMatch, normalizePhonetic } from '@/lib/search-utils';
import type { Item } from '@/lib/types';

interface SearchableItemSelectProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  disabledItemIds: string[];
}

export function SearchableItemSelect({
  items,
  value,
  onChange,
  disabledItemIds,
  placeholder = "Select item",
  className,
  ...props
}: SearchableItemSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Find current selected item
  const selectedItem = React.useMemo(() => {
    return items.find(item => item.id === value);
  }, [items, value]);

  const selectedItemRef = React.useRef(selectedItem);
  React.useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  // Sync searchQuery with value changes
  React.useEffect(() => {
    if (selectedItem) {
      setSearchQuery(selectedItem.title);
    } else {
      setSearchQuery('');
    }
  }, [selectedItem]);

  // Filter items based on searchQuery
  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    if (!query) return []; // Disable suggestions when input query is empty

    // Include current value, exclude other disabled values
    const list = items.filter(item => {
      if (item.id === value) return true;
      return !disabledItemIds.includes(item.id);
    });

    // Try exact matching first
    let matches = list.filter(item => {
      const title = (item.title || '').toLowerCase();
      const company = (item.company || '').toLowerCase();
      const group = (item.medicineGroup || '').toLowerCase();
      return title.includes(query) || company.includes(query) || group.includes(query);
    });

    // Fallback to fuzzy matching if no exact matches found
    if (matches.length === 0) {
      matches = list.filter(item => {
        return isFuzzyMatch(item.title, query) ||
               isFuzzyMatch(item.medicineGroup, query) ||
               isFuzzyMatch(item.company, query);
      });
    }

    const getRelevanceScore = (item: Item) => {
      const title = (item.title || '').toLowerCase();
      const group = (item.medicineGroup || '').toLowerCase();
      const company = (item.company || '').toLowerCase();

      if (title.startsWith(query)) return 1;
      if (title.includes(query)) return 2;
      if (group.startsWith(query)) return 3;
      if (group.includes(query)) return 4;
      if (company.startsWith(query)) return 5;
      if (company.includes(query)) return 6;

      const normTitle = normalizePhonetic(title);
      const normGroup = normalizePhonetic(group);
      const normCompany = normalizePhonetic(company);
      const normQuery = normalizePhonetic(query);

      if (normTitle.startsWith(normQuery)) return 7;
      if (normTitle.includes(normQuery)) return 8;
      if (normGroup.startsWith(normQuery)) return 9;
      if (normGroup.includes(normQuery)) return 10;
      if (normCompany.startsWith(normQuery)) return 11;
      if (normCompany.includes(normQuery)) return 12;

      return 13;
    };

    return matches.sort((a, b) => {
      const scoreA = getRelevanceScore(a);
      const scoreB = getRelevanceScore(b);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return (a.title || '').localeCompare(b.title || '');
    }).slice(0, 50);
  }, [items, searchQuery, value, disabledItemIds]);

  // Reset highlight index when filter list changes
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  // Handle clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query to match selected item name
        setSearchQuery(selectedItem ? selectedItem.title : '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedItem]);

  // Key navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      return; // Allow arrow key events to bubble up for grid row navigation when closed
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredItems[highlightedIndex]) {
        const item = filteredItems[highlightedIndex];
        onChange(item.id);
        setSearchQuery(item.title);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setSearchQuery(selectedItem ? selectedItem.title : '');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => {
          const val = e.target.value;
          setSearchQuery(val);
          setIsOpen(!!val.trim());
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false);
            const currentItem = selectedItemRef.current;
            setSearchQuery(currentItem ? currentItem.title : '');
          }, 200);
        }}
        onKeyDown={handleKeyDown}
        className={cn("w-full h-8 px-3 text-sm font-medium", className)}
        {...props}
        ref={inputRef}
      />
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-popover text-popover-foreground border rounded-md shadow-lg p-1">
          {filteredItems.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`w-full text-left px-2 py-1.5 text-sm rounded-sm transition-colors ${
                idx === highlightedIndex ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
              }`}
              onClick={() => {
                onChange(item.id);
                setSearchQuery(item.title);
                setIsOpen(false);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 50);
              }}
            >
              <div className="font-semibold">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {item.company} {item.medicineGroup ? ` - ${item.medicineGroup}` : ''} {item.expiryDate ? ` | Exp: ${item.expiryDate}` : ''} | Stock: {item.stock}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
