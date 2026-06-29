'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getItems, bulkUpdateItemLocationByCompany } from '@/lib/actions';
import type { Item } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, FolderSync, MapPin } from 'lucide-react';

export default function BulkShelfUpdatePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState('');
  const [newLocation, setNewLocation] = React.useState('');

  const loadData = React.useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allItems = await getItems(user.uid);
      setItems(allItems);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load inventory items.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique sorted list of pharmaceutical companies
  const companies = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.company && item.company.trim()) {
        set.add(item.company.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [items]);

  // Filter medicines belonging to the currently selected company
  const filteredItems = React.useMemo(() => {
    if (!selectedCompany) return [];
    return items.filter(
      (item) =>
        item.company &&
        item.company.trim().toLowerCase() === selectedCompany.trim().toLowerCase()
    );
  }, [selectedCompany, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedCompany) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a company.',
      });
      return;
    }
    if (!newLocation.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please specify the new shelf or row location.',
      });
      return;
    }

    try {
      setUpdating(true);
      const result = await bulkUpdateItemLocationByCompany(
        user.uid,
        selectedCompany,
        newLocation.trim()
      );

      if (result?.success) {
        toast({
          title: 'Location Updated',
          description: `Successfully moved ${result.updatedCount} medicine(s) from ${selectedCompany} to ${newLocation.trim()}.`,
        });
        setNewLocation('');
        // Reload items list from DB
        await loadData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result?.error || 'Failed to update location.',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="font-headline text-3xl font-bold">Bulk Shelf Manager</h1>
        <p className="text-sm text-muted-foreground">
          Shift all medicines from a specific company to another shelf or storage row in one click.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side Form card */}
        <Card className="md:col-span-1 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Update Location</CardTitle>
            <CardDescription>Select manufacturer company and set the new location.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company / Manufacturer</Label>
                <select
                  id="company"
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">New Shelf / Row Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="e.g. Shelf A-3, Row 2"
                    className="pl-9 h-10"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updating || filteredItems.length === 0}
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Relocating...
                  </>
                ) : (
                  <>
                    <FolderSync className="mr-2 h-4 w-4" />
                    Relocate {filteredItems.length} Item(s)
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Side Affected Medicines List card */}
        <Card className="md:col-span-2 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Medicines Preview</span>
              {selectedCompany && (
                <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded-full">
                  {filteredItems.length} items found
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {selectedCompany 
                ? `Showing all stock items manufactured by ${selectedCompany}.`
                : 'Select a manufacturer company on the left to preview medicines.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCompany ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <FolderSync className="h-10 w-10 text-muted-foreground mb-3 animate-pulse" />
                <h4 className="font-semibold text-muted-foreground">No Company Selected</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Choose a company on the left form layout to see affected medicines and their current shelf locations.
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <h4 className="font-semibold text-muted-foreground">No Medicines Associated</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  No stock items in your inventory currently match this company name.
                </p>
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Medicine / Item</th>
                      <th className="p-3 text-center">Current Shelf</th>
                      <th className="p-3 text-center">New Shelf</th>
                      <th className="p-3 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="flex flex-col">
                            <span>{item.title}</span>
                            {item.medicineGroup && (
                              <span className="text-xs text-muted-foreground">{item.medicineGroup}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-muted-foreground text-xs">
                          {item.location || '—'}
                        </td>
                        <td className="p-3 text-center">
                          {newLocation.trim() ? (
                            <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium">
                              <span className="text-muted-foreground line-through font-mono">
                                {item.location || '—'}
                              </span>
                              <ArrowRight className="h-3 w-3 text-primary" />
                              <span className="bg-primary/10 px-2 py-0.5 rounded font-mono">
                                {newLocation.trim()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {item.stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
