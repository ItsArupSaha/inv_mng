'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import type { Item } from '@/lib/types';

interface SearchableItemSelectProps {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  disabledItemIds: string[];
  placeholder?: string;
}

export function SearchableItemSelect({
  items,
  value,
  onChange,
  disabledItemIds,
  placeholder = "Select item",
}: SearchableItemSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Find current selected item
  const selectedItem = React.useMemo(() => {
    return items.find(item => item.id === value);
  }, [items, value]);

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
    
    // Include current value, exclude other disabled values
    const list = items.filter(item => {
      if (item.id === value) return true;
      return !disabledItemIds.includes(item.id);
    });

    if (!query) return list.slice(0, 50); // limit to 50 items if empty query

    return list.filter(item => {
      const title = (item.title || '').toLowerCase();
      const company = (item.company || '').toLowerCase();
      const group = (item.medicineGroup || '').toLowerCase();
      return title.includes(query) || company.includes(query) || group.includes(query);
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
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        const item = filteredItems[highlightedIndex];
        onChange(item.id);
        setSearchQuery(item.title);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
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
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full h-8 px-3 text-sm font-medium"
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
