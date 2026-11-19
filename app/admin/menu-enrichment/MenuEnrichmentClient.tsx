'use client';

import { useState, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  buildEnrichmentQuery,
  filterEnrichmentTargets,
} from '@/lib/services/menuEnrichmentService';
import type { MenuEnrichmentRow } from '@/lib/services/menuEnrichmentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type FilterTab = 'targets' | 'all';

interface MenuEnrichmentClientProps {
  readonly initialTrucks: MenuEnrichmentRow[];
}

export default function MenuEnrichmentClient({ initialTrucks }: MenuEnrichmentClientProps) {
  const [tab, setTab] = useState<FilterTab>('targets');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const base =
      tab === 'targets' ? filterEnrichmentTargets(initialTrucks) : buildEnrichmentQuery(initialTrucks);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.cuisine_type?.some((c) => c.toLowerCase().includes(q)),
    );
  }, [tab, search, initialTrucks]);

  const { targets, completeCount, emptyCount, fbCount, noMenuNoFb } = useMemo(() => {
    const t = filterEnrichmentTargets(initialTrucks);
    return {
      targets: t,
      completeCount: initialTrucks.filter((x) => x.enrichmentStatus === 'complete').length,
      emptyCount: initialTrucks.filter((x) => x.enrichmentStatus === 'empty').length,
      fbCount: initialTrucks.filter((x) => x.facebookUrl !== null).length,
      noMenuNoFb: initialTrucks.filter(
        (x) => x.enrichmentStatus === 'empty' && x.facebookUrl === null,
      ).length,
    };
  }, [initialTrucks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Menu Enrichment</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{initialTrucks.length}</div>
            <p className="text-xs text-muted-foreground">Total Trucks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completeCount}</div>
            <p className="text-xs text-muted-foreground">Has Menu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{emptyCount}</div>
            <p className="text-xs text-muted-foreground">Needs Menu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{fbCount}</div>
            <p className="text-xs text-muted-foreground">Has Facebook</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border p-1">
          <button
            onClick={() => setTab('targets')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'targets'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Targets ({targets.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            All Trucks
          </button>
        </div>
        <Input
          placeholder="Search by name, city, or cuisine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {tab === 'targets' && (
        <p className="text-sm text-muted-foreground">
          {targets.length} trucks with Facebook pages but no menu data. Click the Facebook link
          to research their menu.
          {noMenuNoFb > 0 &&
            ` ${noMenuNoFb} trucks have no Facebook link either — see the worksheet in docs/seo/MENU_ENRICHMENT_WORKSHEET.md.`}
        </p>
      )}

      {tab === 'all' && (
        <p className="text-sm text-muted-foreground">
          All active trucks sorted by enrichment priority: Facebook + no menu first.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tab === 'targets' ? 'Enrichment Targets' : 'All Trucks'} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">City</th>
                  <th className="px-3 py-2 text-left font-medium">Cuisine</th>
                  <th className="px-3 py-2 text-center font-medium">Menu</th>
                  <th className="px-3 py-2 text-center font-medium">Facebook</th>
                  <th className="px-3 py-2 text-center font-medium">Quality</th>
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((truck) => (
                  <tr
                    key={truck.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-medium">{truck.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {truck.city}, {truck.state}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(truck.cuisine_type ?? []).slice(0, 3).map((c) => (
                          <Badge key={c} variant="secondary" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        variant={
                          truck.enrichmentStatus === 'complete'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {truck.menuCount > 0 ? `${truck.menuCount} items` : 'Empty'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {truck.facebookUrl ? (
                        <a
                          href={truck.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-xs font-medium ${
                          truck.data_quality_score >= 75
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {truck.data_quality_score}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {truck.facebookUrl ? (
                        <a
                          href={truck.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No trucks match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
