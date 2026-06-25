'use client';

import * as React from 'react';
import { PlusCircle, Search, X } from 'lucide-react';

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
import { AddExistingAssetDialog } from './add-existing-asset-dialog';
import { AddItemDialog } from './items/add-item-dialog';
import { AddCategoryDialog } from './items/add-category-dialog';
import { ItemsTable } from './items/items-table';
import { ClosingStockDialog } from './items/closing-stock-dialog';
import { CategoriesList } from './items/categories-list';
import { ClosingStockResults } from './items/closing-stock-results';
import { useItemManagement } from '@/hooks/use-item-management';

interface ItemManagementProps {
  userId: string;
}

export default function ItemManagement({ userId }: ItemManagementProps) {
  const {
    categories,
    isInitialLoading,
    isItemDialogOpen,
    setIsItemDialogOpen,
    isCategoryDialogOpen,
    setIsCategoryDialogOpen,
    isStockDialogOpen,
    setIsStockDialogOpen,
    editingItem,
    editingCategory,
    closingStockDate,
    setClosingStockDate,
    closingStockData,
    setClosingStockData,
    isCalculating,
    isPending,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    sortBy,
    setSortBy,
    setVisibleCount,
    loadData,
    handleEditItem,
    handleAddNewItem,
    handleAddNewCategory,
    handleEditCategory,
    handleDeleteItem,
    handleDeleteCategory,
    handleCalculateClosingStock,
    handleDownloadClosingStockPdf,
    handleDownloadClosingStockXlsx,
    expiringAndExpiredMedicines,
    displayedItems,
    hasMore,
    handleLoadMore
  } = useItemManagement(userId);

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">Item Inventory</CardTitle>
            <CardDescription>Manage your item catalog, prices, and stock levels.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
            <Button onClick={handleAddNewItem} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
            <AddExistingAssetDialog userId={userId} onAssetAdded={loadData}>
              <Button variant="outline" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Existing Asset
              </Button>
            </AddExistingAssetDialog>
            <ClosingStockDialog
              isOpen={isStockDialogOpen}
              onOpenChange={setIsStockDialogOpen}
              closingStockDate={closingStockDate}
              onDateChange={setClosingStockDate}
              onCalculate={handleCalculateClosingStock}
              isCalculating={isCalculating}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Expiry Warning Banner */}
        {expiringAndExpiredMedicines.length > 0 && (
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 rounded-lg flex items-start gap-3 animate-in slide-in-from-top duration-300">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-800 dark:text-amber-400">Medicine Expiry Alert</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                There are {expiringAndExpiredMedicines.length} medicine(s) expired or expiring within 30 days.
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-amber-800 dark:text-amber-400 font-semibold underline hover:text-amber-900"
                onClick={() => {
                  setSelectedStatusFilter('expiringSoon');
                  setSelectedCategoryFilter('all');
                }}
              >
                Filter items to view them
              </Button>
            </div>
          </div>
        )}

        {/* Categories Section */}
        <CategoriesList
          categories={categories}
          onAddClick={handleAddNewCategory}
          onEditClick={handleEditCategory}
          onDeleteClick={handleDeleteCategory}
          isPending={isPending}
        />

        {/* Closing Stock Section */}
        <ClosingStockResults
          closingStockData={closingStockData}
          closingStockDate={closingStockDate}
          onDownloadPdf={handleDownloadClosingStockPdf}
          onDownloadXlsx={handleDownloadClosingStockXlsx}
          onClear={() => setClosingStockData([])}
        />

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Current Inventory</h3>
        </div>

        {/* Search, Filter, and Sort Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items by name, group, manufacturer, category, author..."
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
              value={selectedCategoryFilter}
              onValueChange={(val) => {
                setSelectedCategoryFilter(val);
                setVisibleCount(10);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatusFilter}
              onValueChange={(val) => {
                setSelectedStatusFilter(val);
                setVisibleCount(10);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="lowStock">Low Stock (≤5)</SelectItem>
                <SelectItem value="expiringSoon">Expiring Soon (30d)</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title-asc">Title: A to Z</SelectItem>
                <SelectItem value="title-desc">Title: Z to A</SelectItem>
                <SelectItem value="stock-asc">Stock: Low to High</SelectItem>
                <SelectItem value="stock-desc">Stock: High to Low</SelectItem>
                <SelectItem value="group-asc">Medicine Group: A-Z</SelectItem>
                <SelectItem value="company-asc">Company Name: A-Z</SelectItem>
                <SelectItem value="expiry-asc">Expiry Date: Soonest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dedicated Quick Sort Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm bg-muted/20 p-2.5 rounded-lg border border-dashed">
          <span className="text-muted-foreground font-medium mr-1">Quick Sort Medicine:</span>
          <Button
            variant={sortBy === 'group-asc' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full h-8 px-3.5 text-xs font-semibold"
            onClick={() => setSortBy(sortBy === 'group-asc' ? 'title-asc' : 'group-asc')}
          >
            By Group (Generic)
          </Button>
          <Button
            variant={sortBy === 'company-asc' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full h-8 px-3.5 text-xs font-semibold"
            onClick={() => setSortBy(sortBy === 'company-asc' ? 'title-asc' : 'company-asc')}
          >
            By Company / Manufacturer
          </Button>
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
            <Button onClick={handleLoadMore}>Load More</Button>
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
        editingCategory={editingCategory}
        onSuccess={loadData}
      />
    </Card>
  );
}
