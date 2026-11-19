import { useState, useRef, useEffect, useCallback } from 'react';
import { Filter, X, Calendar as CalendarIcon, SlidersHorizontal, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SOURCE_FILTER_OPTIONS } from '@/lib/events/sourceDisplay';
import type { DateRange } from 'react-day-picker';

type SourceFilter = 'all' | 'official' | 'platform' | 'community';

export interface EventFiltersProps {
  isPro: boolean;
  eventCount: number;
  hiddenCount: number;
  filters: {
    startDate: string;
    endDate: string;
    minVettingScore: number;
    minRelevanceScore: number;
    sourceFilter: SourceFilter;
    showUnvetted: boolean;
    researchedOnly: boolean;
    relevantOnly: boolean;
  };
  onFiltersChange: (filters: EventFiltersProps['filters']) => void;
  period?: 'future' | 'past';
  onPeriodChange?: (period: 'future' | 'past') => void;
  showTraffic?: boolean;
  onToggleTraffic?: () => void;
  showHidden?: boolean;
  onToggleShowHidden?: () => void;
  savedCount?: number;
  showSavedOnly?: boolean;
  onToggleShowSavedOnly?: () => void;
}

function formatEventCount(count: number): string {
  return `${count} event${count === 1 ? '' : 's'}`;
}

function parseDateRange(filters: { startDate: string; endDate: string }): DateRange | undefined {
  if (filters.startDate) {
    const from = new Date(filters.startDate + 'T00:00:00');
    const to = filters.endDate ? new Date(filters.endDate + 'T00:00:00') : undefined;
    if (!Number.isNaN(from.getTime())) {
      return { from, to: to && !Number.isNaN(to.getTime()) ? to : undefined };
    }
  }
  return undefined;
}

function formatDateRange(range: DateRange | undefined): string {
  if (!range?.from) return 'All dates';
  const fromStr = range.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!range.to) return fromStr;
  const toStr = range.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (fromStr === toStr) return fromStr;
  return `${fromStr} – ${toStr}`;
}

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function EventFilters({
  isPro,
  eventCount,
  hiddenCount,
  filters,
  onFiltersChange,
  period,
  onPeriodChange,
  showTraffic,
  onToggleTraffic,
  showHidden,
  onToggleShowHidden,
  savedCount,
  showSavedOnly,
  onToggleShowSavedOnly,
}: EventFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [dateOpen, setDateOpen] = useState(false);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkMonthScroll = useCallback(() => {
    const el = monthScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    if (!dateOpen) return;
    const raf = requestAnimationFrame(() => {
      const el = monthScrollRef.current;
      if (!el) return;
      checkMonthScroll();
      el.addEventListener('scroll', checkMonthScroll, { passive: true });
      const observer = new ResizeObserver(checkMonthScroll);
      observer.observe(el);
      cleanupRef.current = () => {
        el.removeEventListener('scroll', checkMonthScroll);
        observer.disconnect();
      };
    });
    return () => {
      cancelAnimationFrame(raf);
      cleanupRef.current?.();
    };
  }, [checkMonthScroll, dateOpen]);

  const scrollMonths = (direction: -1 | 1) => {
    const el = monthScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const selectedRange = parseDateRange(filters);

  const handleRangeSelect = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      startDate: range?.from ? toLocalISO(range.from) : '',
      endDate: range?.to ? toLocalISO(range.to) : '',
    });
  };

  const handleQuickPreset = (preset: 'all' | number) => {
    if (preset === 'all') {
      onFiltersChange({ ...filters, startDate: '', endDate: '' });
    } else {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() + preset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + preset + 1, 0);
      handleRangeSelect({ from: start, to: end });
    }
  };

  const handleSourceFilterChange = (filter: SourceFilter) => {
    onFiltersChange({ ...filters, sourceFilter: filter });
  };

  const handleVettingScoreChange = (value: number[]) => {
    onFiltersChange({ ...filters, minVettingScore: value[0] });
  };

  const handleRelevanceScoreChange = (value: number[]) => {
    onFiltersChange({ ...filters, minRelevanceScore: value[0] });
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-80">
      {isCollapsed ? (
        <Button
          variant="secondary"
          size="icon"
          onClick={handleToggle}
          data-testid="filter-toggle"
          className="bg-background/95 backdrop-blur-sm"
        >
          <Filter className="h-4 w-4" />
        </Button>
      ) : (
        <div
          className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4"
          data-testid="filter-panel"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-medium text-sm">Event Filters</span>
              <Badge variant="secondary" className="text-xs">
                {formatEventCount(eventCount)}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              data-testid="filter-toggle"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {onPeriodChange && (
              <div className="flex gap-1">
                {(['future', 'past'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => onPeriodChange(p)}
                    className={`px-3 py-0.5 text-xs rounded font-medium ${
                      period === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {p === 'future' ? 'Future' : 'Past'}
                  </button>
                ))}
                {onToggleShowHidden && (
                  <button
                    type="button"
                    onClick={onToggleShowHidden}
                    className={`px-3 py-0.5 text-xs rounded font-medium ${
                      showHidden
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : hiddenCount > 0
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                          : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  >
                    Hidden{hiddenCount > 0 ? ` (${hiddenCount})` : ''}
                  </button>
                )}
                {onToggleShowSavedOnly && (
                  <button
                    type="button"
                    onClick={onToggleShowSavedOnly}
                    className={`px-3 py-0.5 text-xs rounded font-medium ${
                      showSavedOnly
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : (savedCount ?? 0) > 0
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                          : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  >
                    Saved{(savedCount ?? 0) > 0 ? ` (${savedCount})` : ''}
                  </button>
                )}
              </div>
            )}

            {onToggleTraffic && (
              <button
                type="button"
                onClick={onToggleTraffic}
                title="Pro"
                className={`px-2 py-0.5 text-xs rounded self-start inline-flex items-center gap-1 ${
                  showTraffic
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-zinc-800/80 text-zinc-400 border border-zinc-600/30 hover:bg-zinc-700/80'
                }`}
              >
                Traffic
                <Crown className="w-3 h-3 text-amber-400" />
              </button>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Date Range
                </span>
                {(filters.startDate || filters.endDate) && (
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('all')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    data-testid="date-range-trigger"
                    className="flex h-9 w-full items-center justify-between rounded-md bg-zinc-800/80 px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-zinc-700/80"
                  >
                    {formatDateRange(selectedRange)}
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="border-0 p-0" align="start" style={{ width: '276px', maxWidth: '276px' }}>
                  <div className="relative flex items-center w-full">
                    {canScrollLeft && (
                      <button
                        type="button"
                        onClick={() => scrollMonths(-1)}
                        className="shrink-0 p-1 text-muted-foreground hover:text-foreground bg-gradient-to-r from-background via-background to-transparent"
                        aria-label="Scroll months left"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div
                      ref={monthScrollRef}
                      className="flex gap-1 p-2 overflow-x-auto flex-1 min-w-0"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('all')}
                      className={`px-2 py-0.5 text-xs rounded shrink-0 ${
                        !filters.startDate && !filters.endDate
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      All
                    </button>
                    {Array.from({ length: 12 }, (_, i) => {
                      const now = new Date();
                      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                      const label = d.toLocaleString('en-US', { month: 'short' });
                      const year = d.getFullYear();
                      const monthStart = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
                      const monthEnd = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                      const isActive = filters.startDate === monthStart && filters.endDate === monthEnd;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleQuickPreset(i)}
                          className={`px-2 py-0.5 text-xs rounded shrink-0 ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    </div>
                    {canScrollRight && (
                      <button
                        type="button"
                        onClick={() => scrollMonths(1)}
                        className="shrink-0 p-1 text-muted-foreground hover:text-foreground bg-gradient-to-l from-background via-background to-transparent"
                        aria-label="Scroll months right"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleRangeSelect}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                variant={filters.researchedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  onFiltersChange({ ...filters, researchedOnly: !filters.researchedOnly })
                }
                className={`text-xs h-7 w-[76px] shrink-0 ${isPro ? '' : 'opacity-50 cursor-not-allowed'}`}
                disabled={isPro === false}
                title={isPro ? '' : 'Upgrade to Pro to filter by research'}
              >
                Research
              </Button>
              <div
                className={`flex items-center gap-2 flex-1 ${isPro ? '' : 'opacity-50 pointer-events-none'}`}
              >
                <Slider
                  min={0}
                  max={50}
                  step={5}
                  value={[filters.minVettingScore]}
                  onValueChange={handleVettingScoreChange}
                  data-testid="vetting-score-slider"
                  className="flex-1"
                  disabled={isPro === false}
                />
                <span className="text-xs text-gray-400 w-8 text-right">
                  {filters.minVettingScore}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                variant={filters.relevantOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFiltersChange({ ...filters, relevantOnly: !filters.relevantOnly })}
                className={`text-xs h-7 w-[76px] shrink-0 ${isPro ? '' : 'opacity-50 cursor-not-allowed'}`}
                disabled={isPro === false}
                title={isPro ? '' : 'Upgrade to Pro to filter by relevance'}
              >
                Relevance
              </Button>
              <div
                className={`flex items-center gap-2 flex-1 ${isPro ? '' : 'opacity-50 pointer-events-none'}`}
              >
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[filters.minRelevanceScore]}
                  onValueChange={handleRelevanceScoreChange}
                  data-testid="relevance-score-slider"
                  className="flex-1"
                  disabled={isPro === false}
                />
                <span className="text-xs text-gray-400 w-8 text-right">
                  {filters.minRelevanceScore}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-500">Source</span>
              <div className="flex gap-1 flex-wrap">
                {SOURCE_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.sourceFilter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSourceFilterChange(option.value)}
                    className="text-xs h-7"
                  >
                    {option.icon && <span className="mr-1">{option.icon}</span>}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
