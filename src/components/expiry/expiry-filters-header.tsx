'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExpiryFiltersHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  setVisibleCount: (count: number) => void;
}

export function ExpiryFiltersHeader({
  searchQuery,
  setSearchQuery,
  selectedStatusFilter,
  setSelectedStatusFilter,
  sortBy,
  setSortBy,
  setVisibleCount,
}: ExpiryFiltersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items by name, group, manufacturer..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setVisibleCount(10);
          }}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchQuery('');
              setVisibleCount(10);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          value={selectedStatusFilter}
          onValueChange={(val) => {
            setSelectedStatusFilter(val);
            setVisibleCount(10);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Alerts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expiry Alerts</SelectItem>
            <SelectItem value="expiringSoon">Expiring Soon (30d)</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expiry-asc">Expiry: Soonest First</SelectItem>
            <SelectItem value="expiry-desc">Expiry: Latest First</SelectItem>
            <SelectItem value="title-asc">Title: A to Z</SelectItem>
            <SelectItem value="group-asc">Medicine Group: A-Z</SelectItem>
            <SelectItem value="company-asc">Company Name: A-Z</SelectItem>
            <SelectItem value="stock-asc">Stock: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
