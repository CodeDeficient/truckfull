'use client';

/**
 * Event Detail Modal Component — Unified (Phase 3B)
 * WBS: Phase 3, Worker B
 *
 * Handles both platform and external events with:
 * - Platform events: existing apply flow
 * - External events: Save Lead + Visit Source link
 * - Pro tier: research section with vetting data
 * - Free tier: basic info + upgrade prompt
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScoreBreakdownBar } from '@/components/ui/ScoreBreakdownBar';
import {
  Edit,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Star,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  ExternalLink,
  Bookmark,
  Shield,
  TrendingUp,
  Search,
  Share2,
  ClipboardCheck,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import type { CitySourceType } from '@/lib/events/types';
import { getTrafficLight } from '@/lib/events/trafficLightBadge';
import { useSaveLead } from '@/hooks/useSaveLead';
import { runAudit, type AuditResult } from '@/lib/events/riskChecklist';

export interface VettingFactors {
  trafficScore: number;
  researchConfidence: number;
  areaEventCount: number;
  recurringCount: number;
}

export interface ResearchData {
  vetting_score: number | null;
  traffic_data: string | null;
  foot_traffic_estimate: string | null;
  research_confidence: string | null;
  last_researched: string | null;
  notes: string | null;
  factors?: VettingFactors | null;
  recommendation?: string | null;
  reasoning?: string | null;
  sources?: string[] | null;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  location_data: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
  };
  start_date: string | null;
  end_date: string | null;
  status: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  organizer: {
    business_name: string;
    rating_avg?: number | null;
    rating_count?: number;
    verification_status?: string;
    user_id?: string;
  };
  event_source?: 'platform' | 'external';
  source?: string;
}

export interface ExternalEvent extends Event {
  source: 'external';
  source_type: CitySourceType | null;
  source_url: string | null;
  vetting_score: number | null;
  relevance_score?: number | null;
  research: ResearchData | null;
}

interface EventDetailModalProps {
  event: Event | ExternalEvent;
  truckId?: string;
  open: boolean;
  onClose: () => void;
  currentUserId?: string;
  onEdit?: () => void;
  userTier?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFee(fee: number | null): string | null {
  if (fee === null) return null;
  if (fee === 0) return 'Free to participate';
  return `$${fee} vendor fee`;
}

function isExternalEvent(event: Event | ExternalEvent): event is ExternalEvent {
  return event.event_source === 'external';
}

function getSourceLabel(sourceType: CitySourceType | null | undefined): string | null {
  if (!sourceType) return null;
  const governmentSources: CitySourceType[] = ['eproval', 'civicplus_rss', 'arcgis_permits'];
  const cvbSources: CitySourceType[] = ['simpleview_rss'];
  if (governmentSources.includes(sourceType)) return 'Government';
  if (cvbSources.includes(sourceType)) return 'CVB';
  if (sourceType === 'eventbrite') return 'Eventbrite';
  if (sourceType === 'algolia_api' || sourceType === 'timely_api' || sourceType === 'tourism_html')
    return 'Tourism Board';
  if (sourceType === 'ical' || sourceType === 'aiken_playwright') return 'City Calendar';
  return 'External';
}

async function submitResearchFeedback(eventId: string, feedback: 'helpful' | 'not_helpful') {
  try {
    await fetch('/api/events/research-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, feedback }),
    });
  } catch {
    // silent fail — feedback is best-effort
  }
}

export function EventDetailModal({
  event,
  truckId,
  open,
  onClose,
  currentUserId,
  onEdit,
  userTier = 'free',
}: EventDetailModalProps) {
  const [paymentAcknowledged, setPaymentAcknowledged] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researchDetails, setResearchDetails] = useState<ResearchData | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualResearching, setManualResearching] = useState(false);
  const [manualResult, setManualResult] = useState<{
    parsed: { name: string; confidence: number; date: string | null; location: Record<string, unknown> } | null;
    score: number | null;
    shared: boolean;
    eventId: string | null;
  } | null>(null);
  const [shareChecked, setShareChecked] = useState(true);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const isOwner = currentUserId && event.organizer?.user_id === currentUserId;
  const external = isExternalEvent(event);

  useEffect(() => {
    if (!open || !external || userTier !== 'pro') return;
    let cancelled = false;
    setResearchLoading(true);
    fetch(`/api/events/${encodeURIComponent(event.id)}/vetting?source=external`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const result = data?.result;
        if (result) {
          const vr = result.vetting_result ?? result;
          setResearchDetails({
            vetting_score: result.vetting_score ?? result.score ?? null,
            traffic_data: vr.traffic_data ?? null,
            foot_traffic_estimate: vr.foot_traffic_estimate ?? null,
            research_confidence: vr.research_confidence ?? vr.confidence ?? null,
            last_researched: result.vetted_at ?? null,
            notes: vr.notes ?? vr.reasoning ?? null,
            factors: result.factors ?? vr.factors ?? null,
            recommendation: result.recommendation ?? vr.recommendation ?? null,
            reasoning: result.reasoning ?? vr.reasoning ?? null,
            sources: result.sources ?? vr.sources ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, event.id, external, userTier]);

  useEffect(() => {
    if (!open || !external || userTier !== 'pro' || !showChecklist) return;

    setAuditResult(
      runAudit({
        parsed: {
          name: event.name,
          date: event.start_date,
          endDate: event.end_date,
          location: {
            address: event.location_data?.address ?? null,
            city: event.location_data?.city ?? null,
            state: event.location_data?.state ?? null,
          },
          time: { start: null, end: null },
          category: null,
          expectedAttendance: null,
          contactInfo: { phone: null, email: null, website: null },
          confidence: 0.5,
        },
        vetting: researchDetails?.factors
          ? {
              score: external ? (event as { vetting_score?: number }).vetting_score ?? 0 : 0,
              factors: {
                trafficScore: researchDetails.factors.trafficScore,
                researchConfidence: researchDetails.factors.researchConfidence,
                historyScore: researchDetails.factors.areaEventCount > 0 ? 0.5 : 0,
                areaEventCount: researchDetails.factors.areaEventCount,
                recurringCount: researchDetails.factors.recurringCount,
              },
              recommendation: researchDetails.recommendation ?? 'limited_data',
              reasoning: researchDetails.reasoning ?? '',
              sources: researchDetails.sources ?? [],
            }
          : null,
        searchConfidence: researchDetails?.factors?.researchConfidence ?? 0,
        sourceCount: researchDetails?.sources?.length ?? 0,
        rawText: event.description ?? event.name,
        evidence: null,
      }),
    );
  }, [open, external, userTier, showChecklist, event.id, event.name, event.start_date, event.end_date, event.location_data, event.description, researchDetails]);

  const {
    saving,
    saved,
    error: saveError,
    saveLead,
  } = useSaveLead({
    eventId: event.id,
    truckId,
  });
  const sourceLabel = external ? getSourceLabel(event.source_type) : null;

  const handleApply = async () => {
    if (!truckId) {
      setError('Please select a truck to apply with');
      return;
    }

    if (event.vendor_fee && !paymentAcknowledged) {
      setError('Please acknowledge the payment disclaimer');
      return;
    }

    try {
      setApplying(true);
      setError(null);

      const response = await fetch('/api/events/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          truck_id: truckId,
          payment_disclaimer_accepted: paymentAcknowledged,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      setApplied(true);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  const handleManualResearch = async () => {
    if (!manualText.trim() || manualText.trim().length < 10) return;
    setManualResearching(true);
    setManualResult(null);
    try {
      const res = await fetch('/api/events/manual-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: manualText.trim(),
          sourceEventId: external ? event.id : undefined,
          shareWithCommunity: !external && shareChecked,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setManualResult({
          parsed: data.result.parsed,
          score: data.result.vetting?.score ?? null,
          shared: data.result.shared,
          eventId: data.result.eventId,
        });
      }
    } catch {
      setManualResult(null);
    } finally {
      setManualResearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{event.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Event details for {event.name}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {isOwner && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit();
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {event.vendor_fee != null && (
                <Badge variant={event.vendor_fee > 0 ? 'default' : 'secondary'}>
                  {formatFee(event.vendor_fee)}
                </Badge>
              )}
              {sourceLabel && (
                <Badge variant="outline" className="text-xs">
                  {sourceLabel}
                </Badge>
              )}
              {(() => {
                if (!external || userTier !== 'pro' || event.vetting_score == null) return null;
                const trafficLight = getTrafficLight({
                  vettingScore: event.vetting_score,
                  relevanceScore: event.relevance_score,
                  verificationBadge: null,
                  sourceCategory: 'community',
                });
                return (
                  <Badge className={`text-xs ${trafficLight.bgClass}`}>
                    {trafficLight.emoji} {trafficLight.label}
                  </Badge>
                );
              })()}
            </div>
          </div>
          {event.organizer?.business_name && event.organizer.business_name !== 'Unknown' && (
            <div className="mt-1 text-sm text-muted-foreground">
              Organized by {event.organizer.business_name}
              {event.organizer.verification_status === 'verified' && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Verified
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                <div>
                  <div>{formatDate(event.start_date)}</div>
                  <div className="text-muted-foreground">to {formatDate(event.end_date)}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <div>
                  {event.location_data.address && <div>{event.location_data.address}</div>}
                  <div>
                    {event.location_data.city}, {event.location_data.state}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {(!external || event.max_vendors != null) && (
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                  {event.max_vendors ? `${event.max_vendors} vendor slots` : 'Unlimited vendors'}
                </div>
              )}
              {event.organizer?.rating_avg && (
                <div className="flex items-center text-sm">
                  <Star className="w-4 h-4 mr-2 text-amber-500 fill-current" />
                  {event.organizer.rating_avg.toFixed(1)} ({event.organizer.rating_count} reviews)
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">About This Event</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          </div>

          {external && event.source_url && (
            <div>
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View Source
              </a>
            </div>
          )}

          {external && userTier === 'pro' && event.vetting_score != null && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Event Research
                {researchDetails?.recommendation && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {researchDetails.recommendation.replaceAll('_', ' ')}
                  </Badge>
                )}
              </h4>
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <ScoreBreakdownBar
                  label="Overall Score"
                  score={event.vetting_score ?? 0}
                  maxScore={100}
                />
                {event.relevance_score != null && (
                  <ScoreBreakdownBar
                    label="Relevance"
                    score={event.relevance_score}
                    maxScore={10}
                  />
                )}
                {researchLoading && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Loading detailed breakdown...
                  </p>
                )}
                {researchDetails?.factors && (
                  <button
                    type="button"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {showBreakdown ? '▼' : '▶'} Score Breakdown
                  </button>
                )}
                {showBreakdown && researchDetails?.factors && (
                  <div className="space-y-3 pt-2 border-t">
                    <ScoreBreakdownBar
                      label="DOT Traffic (25%)"
                      score={Math.round(researchDetails.factors.trafficScore * 100)}
                      maxScore={100}
                    />
                    <ScoreBreakdownBar
                      label="Research Confidence (30%)"
                      score={Math.round(researchDetails.factors.researchConfidence * 100)}
                      maxScore={100}
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Area Event Density (20%)</span>
                      <span className="font-medium">
                        {researchDetails.factors.areaEventCount == null
                          ? 'Data unavailable'
                          : `${researchDetails.factors.areaEventCount} events within 10mi`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Recurring Event (25%)</span>
                      <span className="font-medium">
                        {researchDetails.factors.recurringCount == null
                          ? 'Data unavailable'
                          : researchDetails.factors.recurringCount === 0
                            ? 'First-time event'
                            : `Happened ${researchDetails.factors.recurringCount} time${researchDetails.factors.recurringCount === 1 ? '' : 's'} before`}
                      </span>
                    </div>
                  </div>
                )}
                {researchDetails?.reasoning && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {researchDetails.reasoning}
                    </p>
                  </div>
                )}
                {researchDetails?.sources && researchDetails.sources.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Sources checked:</p>
                    <div className="flex flex-wrap gap-1">
                      {researchDetails.sources.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {researchDetails?.last_researched && (
                  <div className="text-xs text-muted-foreground pt-1">
                    Last researched:{' '}
                    {new Date(researchDetails.last_researched).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2">
                We&apos;re still building this. Scores may not always be accurate — your feedback helps us improve.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Was this helpful?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => submitResearchFeedback(event.id, 'helpful')}
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => submitResearchFeedback(event.id, 'not_helpful')}
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {external && userTier === 'pro' && event.vetting_score == null && (
            <div className="space-y-3">
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>
                  <span className="text-sm">
                    No automated research available. Paste event text or upload a poster/flyer to
                    research this event manually.
                  </span>
                </AlertDescription>
              </Alert>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Manual Research
                </h4>
                <textarea
                  className="w-full rounded border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Paste event details, poster text, or flyer content here..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  maxLength={10_000}
                />
                <p className="text-xs text-muted-foreground">{manualText.length}/10,000 characters</p>
                <div className="flex items-center justify-between">
                  {external ? (
                    <span />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id="share-community"
                        checked={shareChecked}
                        onCheckedChange={(checked) => setShareChecked(checked === true)}
                      />
                      <label htmlFor="share-community" className="cursor-pointer">
                        Share with other Pro users
                      </label>
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={handleManualResearch}
                    disabled={manualResearching || manualText.trim().length < 10}
                  >
                    {manualResearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Researching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-1" />
                        Research
                      </>
                    )}
                  </Button>
                </div>
                {manualResult && (
                  <div className="border rounded p-3 space-y-2">
                    {manualResult.parsed && (
                      <div className="text-sm">
                        <p className="font-medium">{manualResult.parsed.name}</p>
                        <p className="text-muted-foreground">
                          Confidence: {Math.round(manualResult.parsed.confidence * 100)}%
                          {manualResult.parsed.date && ` | ${manualResult.parsed.date}`}
                        </p>
                      </div>
                    )}
                    {manualResult.score != null && (
                      <ScoreBreakdownBar label="Vetting Score" score={manualResult.score} maxScore={100} />
                    )}
                    {manualResult.shared && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Share2 className="w-3 h-3" /> Shared with Pro users
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {external && userTier === 'free' && (
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                <span className="text-sm">
                  Upgrade to Pro to view full event research including traffic data, foot traffic
                  estimates, and vetting details.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {external && userTier === 'pro' && (
            <div>
              <button
                type="button"
                onClick={() => setShowChecklist(!showChecklist)}
                className="flex items-center gap-2 text-sm font-medium hover:text-blue-400 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" />
                {showChecklist ? '▼' : '▶'} Risk Assessment
              </button>
              {showChecklist && auditResult && (
                <div className="mt-3 space-y-3 bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">{auditResult.summary}</p>
                  <div className="space-y-1.5">
                    {auditResult.checks.map((check) => (
                      <div key={check.id} className="flex items-start gap-2.5 text-sm">
                        {check.status === 'pass' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        ) : check.status === 'fail' ? (
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        ) : check.status === 'warn' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                        ) : (
                          <MinusCircle className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <span className={check.status === 'fail' ? 'text-red-300' : check.status === 'warn' ? 'text-yellow-300' : ''}>
                            {check.label}
                          </span>
                          <p className="text-xs text-muted-foreground">{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {auditResult.suggestions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t">
                      {auditResult.suggestions.map((s, i) => (
                        <div
                          key={i}
                          className={`text-xs px-2.5 py-1.5 rounded ${
                            s.severity === 'critical'
                              ? 'bg-red-500/10 text-red-400'
                              : s.severity === 'warning'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {s.severity === 'critical' ? '!' : s.severity === 'warning' ? '!' : 'i'}{' '}
                          {s.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {event.vendor_fee && event.vendor_fee > 0 && !external && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm">
                    This event has a <strong>${event.vendor_fee}</strong> vendor fee. Payment is
                    handled directly between you and the organizer — TruckFull does not process
                    payments.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="payment-acknowledge"
                      checked={paymentAcknowledged}
                      onCheckedChange={(checked) => setPaymentAcknowledged(checked === true)}
                    />
                    <label htmlFor="payment-acknowledge" className="text-sm cursor-pointer">
                      I understand payment is handled directly with the organizer
                    </label>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {(error || saveError) && (
            <Alert variant="destructive">
              <AlertDescription>{error || saveError}</AlertDescription>
            </Alert>
          )}

          {applied && (
            <Alert className="border-green-500/50 bg-green-500/10 dark:bg-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                Your application has been submitted! The organizer will review it and respond soon.
              </AlertDescription>
            </Alert>
          )}

          {saved && (
            <Alert className="border-green-500/50 bg-green-500/10 dark:bg-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                Lead saved!
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-end pt-4 border-t">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {external && !saved && (
                <Button onClick={saveLead} disabled={saving || !truckId}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 mr-2" />
                      Save Lead
                    </>
                  )}
                </Button>
              )}
              {!external && !applied && !isOwner && (
                <Button
                  onClick={handleApply}
                  disabled={
                    applying ||
                    !truckId ||
                    (event.vendor_fee !== null && event.vendor_fee > 0 && !paymentAcknowledged)
                  }
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Apply Now
                    </>
                  )}
                </Button>
              )}
              {isOwner && (
                <div className="text-sm text-muted-foreground italic">
                  You are the organizer of this event.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
