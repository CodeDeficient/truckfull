'use client';

/**
 * Field Guide Panel Component
 *
 * Side panel showing high-traffic locations for food truck owners.
 * Part of the owner dashboard.
 *
 * Tier access:
 * - Pro: Full details + foot traffic + filtering
 */

import {
  TrendingUp,
  MapPin,
  ChevronRight,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Car,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import { parseLocationName, formatAADT, getTrafficLevelInfo } from '@/lib/utils/trafficUtils';

interface TrafficNode {
  id: string;
  station_id: string;
  aadt: number;
  lat: number;
  lng: number;
  location_description: string | null;
  score_percentile: number;
  distance_miles: number; // Distance in miles (American units)
}

// Export AreaStats and update interface to match API response
export interface AreaStats {
  station_count: number;
  avg_aadt: number;
  max_aadt: number;
  percentile_score: number;
  traffic_level: string;
}

interface FieldGuidePanelProps {
  userTier: 'free' | 'pro' | null;
  userLocation: { lat: number; lng: number } | null;
  onNodeSelect?: (node: TrafficNode) => void;
  onUpgrade?: () => void;
  selectedNode: TrafficNode | null;
  onClearSelection: () => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  // New props for lifted state
  nodes: TrafficNode[];
  areaStats: AreaStats | null;
  loading: boolean;
  error: string | null;
}

function getTrafficLevelColor(level: string): string {
  switch (level) {
    case 'high': {
      return 'bg-red-100 text-red-800';
    }
    case 'medium': {
      return 'bg-yellow-100 text-yellow-800';
    }
    case 'low': {
      return 'bg-green-100 text-green-800';
    }
    default: {
      return 'bg-gray-100 text-gray-800';
    }
  }
}

function formatRadiusMiles(radiusMeters: number): string {
  const miles = Math.round((radiusMeters / 1609.344) * 10) / 10;
  return Number.isInteger(miles) ? `${miles}` : miles.toFixed(1);
}

export function FieldGuidePanel({
  userTier,
  userLocation,
  onNodeSelect,
  onUpgrade,
  selectedNode,
  onClearSelection,
  radius,
  onRadiusChange,
  // New props
  nodes,
  areaStats,
  loading,
  error,
}: FieldGuidePanelProps) {
  // Internal state and fetch logic removed - lifted to parent

  // Free tier - show upgrade prompt
  if (!userTier || userTier === 'free') {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Field Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            Discover high-traffic locations perfect for your food truck using official DOT data.
          </p>
           <Button onClick={onUpgrade} className="w-full">
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No location yet
  if (!userLocation) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Field Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>Enable location to see nearby traffic data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Field Guide
          </CardTitle>
          {areaStats && (
            <Badge className={getTrafficLevelColor(areaStats.traffic_level)}>
              {areaStats.traffic_level.charAt(0).toUpperCase() + areaStats.traffic_level.slice(1)}{' '}
              Traffic Area
            </Badge>
          )}

          {/* Radius Selector with Tier Limits */}
          <div className="ml-2 relative group">
            <select
              className="h-8 w-28 text-xs bg-background border border-input rounded-md px-2 cursor-pointer"
              value={radius}
              onChange={(e) => {
                const newRadius = Number(e.target.value);
                onRadiusChange(newRadius);
              }}
            >
              <option value={8047}>5 mi</option>
              <option value={16_093}>10 mi</option>
              <option value={40_233}>25 mi</option>
              <option value={80_467}>50 mi</option>
              <option value={160_934}>100 mi</option>
              <option value={321_869}>200 mi</option>
              <option value={482_803}>300 mi</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Area Stats Summary */}
        {areaStats && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div
              className="bg-gray-50 rounded p-2"
              title="Traffic monitoring stations in this area"
            >
              <div className="text-lg font-bold text-gray-900">
                {areaStats.station_count.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Stations</div>
            </div>
            <div
              className="bg-gray-50 rounded p-2"
              title="Average vehicles per day across all stations"
            >
              <div className="text-lg font-bold text-gray-900">
                {(areaStats.avg_aadt / 1000).toFixed(1)}K
              </div>
              <div className="text-xs text-gray-500">Avg/Day</div>
            </div>
            <div className="bg-gray-50 rounded p-2" title="Highest single location traffic count">
              <div className="text-lg font-bold text-gray-900">
                {(areaStats.max_aadt / 1000).toFixed(1)}K
              </div>
              <div className="text-xs text-gray-500">Hottest</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm py-4">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Details View or Top Locations List */}
        {!loading && !error && (
          <div className="space-y-2">
            {selectedNode ? (
              /* Selected Node Details View */
              <div className="animate-in slide-in-from-right space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="pl-0 gap-1 hover:bg-transparent -ml-2 text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to list
                </Button>

                <div className="space-y-1">
                  <h3 className="font-semibold text-lg leading-tight">
                    {parseLocationName(selectedNode.location_description, selectedNode.station_id)}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {(selectedNode.distance_miles ?? 0).toFixed(1)} mi
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center border">
                    <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                      <Car className="w-3 h-3" />
                      Daily Traffic
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatAADT(selectedNode.aadt)}
                    </div>
                    <div className="text-xs text-gray-500">vehicles/day</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border">
                    <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Percentile
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedNode.score_percentile}%
                    </div>
                    {(() => {
                      const info = getTrafficLevelInfo(selectedNode.score_percentile);
                      return <Badge className={`text-xs mt-1 ${info.color}`}>{info.label}</Badge>;
                    })()}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Traffic Insight</h4>
                  <p className="text-xs text-blue-700">
                    {selectedNode.score_percentile >= 60
                      ? `This location sees more traffic than ${selectedNode.score_percentile}% of all monitored points. High visibility potential!`
                      : `This location has moderate traffic. Consider checking peak hours.`}
                  </p>
                </div>

                <div className="border border-dashed border-gray-200 rounded-lg p-3 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">Nearby Businesses</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      Coming Soon
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Business names, contact info, and vendor setup opportunities will appear here.
                  </p>
                </div>
              </div>
            ) : (
              /* List View */
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Top Locations Nearby*
                </h4>

                {nodes.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No traffic stations found within {formatRadiusMiles(radius)} mi
                  </p>
                ) : (
                  <div className="space-y-1">
                    {nodes.slice(0, 5).map((node, index) => (
                      <button
                        key={node.id}
                        onClick={() => onNodeSelect?.(node)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-200"
                      >
                        <div
                          className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold shadow-sm"
                          style={{
                            backgroundColor:
                              index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#eab308',
                          }}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate group-hover:text-blue-600 transition-colors">
                            {parseLocationName(node.location_description, node.station_id)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatAADT(node.aadt)} cars/day</span>
                            <span>•</span>
                            <span>{(node.distance_miles ?? 0).toFixed(1)} mi</span>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Data source disclaimer */}
             <p className="text-[10px] text-muted-foreground mt-3 italic">
               * Historical traffic data from 2024 SCDOT/GDOT
             </p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
