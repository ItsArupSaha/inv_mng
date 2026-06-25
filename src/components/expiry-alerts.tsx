'use client';

import * as React from 'react';
import { Search, X, FileText, FileSpreadsheet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddItemDialog } from './items/add-item-dialog';
import { AddCategoryDialog } from './items/add-category-dialog';
import { ItemsTable } from './items/items-table';
import { useExpiryAlerts } from '@/hooks/use-expiry-alerts';

interface ExpiryAlertsProps {
  userId: string;
}

export default function ExpiryAlerts({ userId }: ExpiryAlertsProps) {
  const {
    categories,
    isInitialLoading,
    isItemDialogOpen,
    setIsItemDialogOpen,
    isCategoryDialogOpen,
    setIsCategoryDialogOpen,
    editingItem,
    searchQuery,
    setSearchQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    sortBy,
    setSortBy,
    setVisibleCount,
    isPending,
    displayedItems,
    hasMore,
    loadData,
    handleEditItem,
    handleDeleteItem,
    handleAddNewCategory,
    handleLoadMore,
    handlePdf,
    handleXlsx,
    filteredAndSortedItems,
  } = useExpiryAlerts({ userId });

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">Expiry Alerts</CardTitle>
            <CardDescription>View, manage, and download lists of expired medicines or items expiring within 30 days.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
            <Button variant="outline" size="sm" onClick={handlePdf} disabled={filteredAndSortedItems.length === 0} className="w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleXlsx} disabled={filteredAndSortedItems.length === 0} className="w-full sm:w-auto">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
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
            <Select value={selectedStatusFilter} onValueChange={(val) => {
              setSelectedStatusFilter(val);
              setVisibleCount(10);
            }}>
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

        <ItemsTable
          items={displayedItems}
          isInitialLoading={isInitialLoading}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          isPending={isPending}
        />

        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </CardContent>

      <AddItemDialog
        userId={userId}
        isOpen={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        editingItem={editingItem}
        categories={categories}
        onSuccess={loadData}
        onAddCategoryClick={handleAddNewCategory}
      />

      <AddCategoryDialog
        userId={userId}
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        editingCategory={null}
        onSuccess={loadData}
      />
    </Card>
  );
}

