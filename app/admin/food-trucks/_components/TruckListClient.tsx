// app/admin/food-trucks/_components/TruckListClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { FoodTruck } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TruckListClientProps {
  readonly initialTrucks: FoodTruck[];
  readonly initialError: string | undefined;
}

function getVerificationStatusClass(verificationStatus: string | null | undefined) {
  if (verificationStatus === 'verified') {
    return 'bg-green-100 text-green-800';
  }
  if (verificationStatus === 'pending') {
    return 'bg-yellow-100 text-yellow-800';
  }
  return 'bg-red-100 text-red-800';
}

function getQualityTier(score: number = 0): { label: string; color: string } {
  const s = score;
  if (s >= 0.8) return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  if (s >= 0.5) return { label: 'Silver', color: 'bg-slate-100 text-slate-800 border-slate-200' };
  return { label: 'Bronze', color: 'bg-orange-100 text-orange-800 border-orange-200' };
}

export function TruckListClient({ initialTrucks, initialError }: TruckListClientProps) {
  const [trucks, setTrucks] = useState<FoodTruck[]>(initialTrucks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [searchTerm, setSearchTerm] = useState('');

  // Sync Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: number;
    failed: number;
    details: string[];
  } | null>(null);

  useEffect(() => {
    if (initialError != undefined) {
      setError(initialError);
    }
  }, [initialError]);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(undefined);
    try {
      const filtered = initialTrucks.filter(
        (truck) =>
          (truck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            truck.cuisine_type?.some((cuisine: string) =>
              cuisine.toLowerCase().includes(searchTerm.toLowerCase()),
            )) ??
          false,
      );
      setTrucks(filtered);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  // Selection Logic
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === trucks.length && trucks.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trucks.map((t) => t.id)));
    }
  };

  // Sync Logic
  const handleSync = async () => {
    if (selectedIds.size === 0) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/admin/sync-trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckIds: [...selectedIds] }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync trucks');
      }

      setSyncResult(result.results);

      // Clear selection on partial or full success
      if (result.results.success > 0) {
        setSelectedIds(new Set());
      }
    } catch (error_) {
      console.error('Sync failed', error_);
      // Show simple error
      globalThis.alert(
        `Sync failed: ${error_ instanceof Error ? error_.message : 'Unknown error'}`,
      );
    } finally {
      setIsSyncing(false);
    }
  };

  if (error != undefined) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Food Trucks</CardTitle>
          <CardDescription className="text-red-700">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => globalThis.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Food Trucks</CardTitle>
              <CardDescription>Manage and sync your truck listings</CardDescription>
            </div>

            {selectedIds.size > 0 && (
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Sync {selectedIds.size} Selected to Prod
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search food trucks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Sync Results Feedback */}
          {syncResult && (
            <div
              className={`mt-4 p-4 rounded-lg border ${syncResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {syncResult.failed === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="font-semibold">
                  {syncResult.success} synced successfully, {syncResult.failed} failed
                </span>
              </div>
              {syncResult.details.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2 max-h-32 overflow-y-auto">
                  {syncResult.details.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trucks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={trucks.length > 0 && selectedIds.size === trucks.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Quality Score</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((truck) => {
                let score = truck.data_quality_score ?? 0;
                if (score > 1) score = score / 100;

                const tier = getQualityTier(score);
                const isReady = score >= 0.8;

                return (
                  <TableRow
                    key={truck.id}
                    className={selectedIds.has(truck.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(truck.id)}
                        onCheckedChange={() => toggleSelect(truck.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{truck.name}</TableCell>
                    <TableCell>{truck.cuisine_type?.join(', ') ?? 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-0.5 rounded border ${tier.color}`}>
                            {tier.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-24 bg-secondary rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${score >= 0.8 ? 'bg-yellow-500' : score >= 0.5 ? 'bg-slate-500' : 'bg-orange-500'}`}
                            style={{ width: `${score * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isReady ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                        >
                          {isReady ? 'Ready' : 'Draft'}
                        </span>
                        {isReady && (
                          <span className="text-[10px] text-muted-foreground">Synced</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getVerificationStatusClass(truck.verification_status)}`}
                      >
                        {truck.verification_status ?? 'unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {trucks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No food trucks found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
