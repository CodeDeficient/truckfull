'use client';

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
  distance_miles: number;
}

export interface AreaStats {
  station_count: number;
  avg_aadt: number;
  max_aadt: number;
  percentile_score: number;
  traffic_level: string;
}

interface FieldGuideSheetContentProps {
  onNodeSelect?: (node: TrafficNode) => void;
  selectedNode: TrafficNode | null;
  onClearSelection: () => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
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

export function FieldGuideSheetContent({
  onNodeSelect,
  selectedNode,
  onClearSelection,
  radius,
  onRadiusChange,
  nodes,
  areaStats,
  loading,
  error,
}: FieldGuideSheetContentProps) {
  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Header row: title + badge + radius */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="h-5 w-5 text-orange-600 shrink-0" />
          <h3 className="font-semibold text-sm truncate">Field Guide</h3>
          {areaStats && (
            <Badge className={`text-xs shrink-0 ${getTrafficLevelColor(areaStats.traffic_level)}`}>
              {areaStats.traffic_level.charAt(0).toUpperCase() + areaStats.traffic_level.slice(1)}{' '}
              Area
            </Badge>
          )}
        </div>

        <select
          className="h-7 w-24 text-xs bg-background border border-input rounded-md px-1 cursor-pointer shrink-0"
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
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

      {/* Area Stats Summary */}
      {areaStats && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-base font-bold text-gray-900">
              {areaStats.station_count.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500">Stations</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-base font-bold text-gray-900">
              {(areaStats.avg_aadt / 1000).toFixed(1)}K
            </div>
            <div className="text-[10px] text-gray-500">Avg/Day</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-base font-bold text-gray-900">
              {(areaStats.max_aadt / 1000).toFixed(1)}K
            </div>
            <div className="text-[10px] text-gray-500">Hottest</div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {selectedNode ? (
            <div className="animate-in slide-in-from-right space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="pl-0 gap-1 hover:bg-transparent -ml-2 text-muted-foreground h-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to list
              </Button>

              <div className="space-y-0.5">
                <h4 className="font-semibold text-sm leading-tight">
                  {parseLocationName(selectedNode.location_description, selectedNode.station_id)}
                </h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {(selectedNode.distance_miles ?? 0).toFixed(1)} mi
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center border">
                  <div className="flex items-center justify-center gap-1 text-gray-500 text-[10px] mb-0.5">
                    <Car className="w-3 h-3" />
                    Daily Traffic
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatAADT(selectedNode.aadt)}
                  </div>
                  <div className="text-[10px] text-gray-500">vehicles/day</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center border">
                  <div className="flex items-center justify-center gap-1 text-gray-500 text-[10px] mb-0.5">
                    <TrendingUp className="w-3 h-3" />
                    Percentile
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {selectedNode.score_percentile}%
                  </div>
                  {(() => {
                    const info = getTrafficLevelInfo(selectedNode.score_percentile);
                    return <Badge className={`text-[10px] mt-0.5 ${info.color}`}>{info.label}</Badge>;
                  })()}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                <p className="text-[11px] text-blue-700">
                  {selectedNode.score_percentile >= 60
                    ? `This location sees more traffic than ${selectedNode.score_percentile}% of all monitored points. High visibility potential!`
                    : 'This location has moderate traffic. Consider checking peak hours.'}
                </p>
              </div>

              <div className="border border-dashed border-gray-200 rounded-lg p-2.5 bg-gray-50/50">
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="font-medium">Nearby Businesses</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    Coming Soon
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                Top Locations Nearby*
              </h4>

              {nodes.length === 0 ? (
                <p className="text-sm text-gray-500 py-1">
                  No traffic stations found within {formatRadiusMiles(radius)} mi
                </p>
              ) : (
                <div className="space-y-1">
                  {nodes.slice(0, 5).map((node, index) => (
                    <button
                      key={node.id}
                      onClick={() => onNodeSelect?.(node)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-200"
                    >
                      <div
                        className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold shrink-0"
                        style={{
                          backgroundColor:
                            index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#eab308',
                        }}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate group-hover:text-blue-600 transition-colors">
                          {parseLocationName(node.location_description, node.station_id)}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span>{formatAADT(node.aadt)} cars/day</span>
                          <span>•</span>
                          <span>{(node.distance_miles ?? 0).toFixed(1)} mi</span>
                        </div>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[9px] text-muted-foreground italic">
                * Historical traffic data from 2024 SCDOT/GDOT
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
