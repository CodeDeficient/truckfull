'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScoreBreakdownBar } from '@/components/ui/ScoreBreakdownBar';
import {
  Search,
  Shield,
  MapPin,
  Calendar as CalendarIcon,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Users,
  ImagePlus,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Pencil,
  RotateCcw,
  Phone,
  BadgeCheck,
  Eye,
  EyeOff,
  Fingerprint,
  ClipboardList,
} from 'lucide-react';
import { runAudit, type AuditCheck } from '@/lib/events/riskChecklist';
import {
  validateImageFile,
  validateImageDimensions,
} from '@/lib/validation/imageValidation';

interface ParsedEvent {
  name: string;
  description: string;
  date: string | null;
  endDate: string | null;
  location: {
    address: string | null;
    city: string | null;
    state: string | null;
  };
  time: {
    start: string | null;
    end: string | null;
  };
  category: string | null;
  expectedAttendance: number | null;
  contactInfo: {
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  confidence: number;
}

interface VettingResult {
  score: number;
  factors: {
    trafficScore: number;
    researchConfidence: number;
    historyScore: number;
    areaEventCount: number;
    recurringCount: number;
  };
  recommendation: string;
  reasoning: string;
  sources: string[];
}

interface SearchResult {
  parsed: ParsedEvent | null;
  vetting: VettingResult | null;
  searchConfidence: number;
  sources: Array<{ title: string; url: string; snippet: string }>;
  evidence: {
    taggedSources: Array<{
      source: { title: string; url: string; snippet: string };
      tag: 'relevant' | 'mentioned' | 'off-topic';
      verification: {
        claimsVerified: Record<string, { status: string; score: number; evidence: string | null }>;
        supportingQuotes: string[];
        totalScore: number;
      };
      fullContentFetched: boolean;
    }>;
    overallConfidence: number;
    criticalClaimsCoverage: number;
    phoneVerification: VerificationResult | null;
    emailVerification: VerificationResult | null;
    websiteVerification: VerificationResult | null;
    droppedSourceCount: number;
    isNameFragment: boolean;
  } | null;
  eventId: string | null;
}

type VerificationResult = {
  status: 'validated' | 'mismatch' | 'not_found' | 'skipped';
  venueName: string | null;
  carrier: string | null;
  venuePhone: string | null;
};

interface EventInvestigateProps {
  truckId?: string;
  userTier?: string;
  onSwitchTab?: (tab: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function verdictMeta(score: number): { label: string; dotClass: string; badgeClass: string } {
  if (score >= 70) return { label: 'Likely Legitimate', dotClass: 'bg-green-400', badgeClass: 'bg-green-500/20 text-green-300' };
  if (score >= 40) return { label: 'Needs Verification', dotClass: 'bg-amber-400', badgeClass: 'bg-amber-500/20 text-amber-300' };
  if (score > 0) return { label: 'High Risk', dotClass: 'bg-red-400', badgeClass: 'bg-red-500/20 text-red-300' };
  return { label: 'Insufficient Data', dotClass: 'bg-zinc-500', badgeClass: 'bg-zinc-500/20 text-zinc-300' };
}

function CheckIcon({ status }: { status: AuditCheck['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />;
  if (status === 'fail') return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  return <MinusCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function EventInvestigate({ userTier, onSwitchTab }: EventInvestigateProps) {
  const [text, setText] = useState('');
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [auditResult, setAuditResult] = useState<ReturnType<typeof runAudit> | null>(null);
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const handleImageSelect = useCallback(async (file: File) => {
    const fileCheck = validateImageFile(file);
    if (!fileCheck.valid) {
      setError(fileCheck.error ?? 'Invalid file');
      return;
    }
    const dimCheck = await validateImageDimensions(file);
    if (!dimCheck.valid) {
      setError(dimCheck.error ?? 'Invalid dimensions');
      return;
    }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageSelect(file);
    },
    [handleImageSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageSelect(file);
    },
    [handleImageSelect],
  );

  const clearImage = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [imagePreview]);

  const runOcr = async () => {
    if (!imageFile) return;
    setOcrLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const response = await fetch('/api/events/ocr', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'OCR failed');
      if (data.text) {
        setText((prev) => {
          const separator = prev.trim().length > 0 ? '\n\n--- OCR extracted ---\n\n' : '';
          return prev + separator + data.text;
        });
      }
      if (data.warning) setError(data.warning);
      clearImage();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'OCR failed');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleResearch = async () => {
    if (text.trim().length < 10) return;
    setResearching(true);
    setResult(null);
    setError(null);
    setVerdictOpen(false);
    setEvidenceOpen(false);
    setBreakdownOpen(false);
    setAuditResult(null);
    setInputCollapsed(false);
    try {
      const response = await fetch('/api/events/manual-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Research failed');
      const r = data.result as SearchResult;
      setResult(r);
      setInputCollapsed(true);
      setAuditResult(
        runAudit({
          parsed: r.parsed,
          vetting: r.vetting,
          searchConfidence: r.searchConfidence,
          sourceCount: r.sources.length,
          rawText: text,
          evidence: r.evidence ? {
            overallConfidence: r.evidence.overallConfidence,
            criticalClaimsCoverage: r.evidence.criticalClaimsCoverage,
            confirmedCount: r.evidence.taggedSources.filter((s) => s.tag === 'relevant').length,
            tangentialCount: r.evidence.taggedSources.filter((s) => s.tag === 'mentioned').length,
            droppedSourceCount: r.evidence.droppedSourceCount,
            isNameFragment: r.evidence.isNameFragment,
            expectedAttendance: r.parsed?.expectedAttendance ?? null,
            phoneVerification: r.evidence.phoneVerification,
            emailVerification: r.evidence.emailVerification,
            websiteVerification: r.evidence.websiteVerification,
          } : null,
        }),
      );
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Research failed');
    } finally {
      setResearching(false);
    }
  };

  const handleReset = () => {
    setText('');
    setResult(null);
    setError(null);
    clearImage();
    setAuditResult(null);
    setVerdictOpen(false);
    setEvidenceOpen(false);
    setBreakdownOpen(false);
    setInputCollapsed(false);
  };

  if (userTier !== 'pro') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm py-12 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-base font-semibold mb-1">Pro Feature</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Investigate events from anywhere — paste a poster, flyer, or text and get instant vetting.
          </p>
        </div>
      </div>
    );
  }

  const previewLine = text.trim().split('\n')[0]?.slice(0, 60) ?? '';
  const hasResults = result !== null && !researching;
  const p = result?.parsed;
  const v = result?.vetting;

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {hasResults && inputCollapsed ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm">
          <span className="text-muted-foreground truncate flex-1">
            &ldquo;{previewLine}&hellip;&rdquo;
          </span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setInputCollapsed(false)}>
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={handleReset}>
            <RotateCcw className="w-3 h-3 mr-1" />
            New
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
          <textarea
            className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm resize-y placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/30 min-h-[200px] max-h-[60vh]"
            rows={8}
            placeholder={inputFocused ? '' : 'Paste event details — a poster, flyer text, or Facebook event description...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            maxLength={10_000}
            disabled={researching || ocrLoading}
          />

          <div
            className="relative"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

            {imagePreview ? (
              <div className="flex items-center gap-2">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-20 rounded-lg border border-white/10" />
                  <button type="button" onClick={clearImage} className="absolute -top-1 -right-1 bg-black/80 rounded-full p-0.5 hover:bg-black text-white">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={runOcr} disabled={ocrLoading}>
                  {ocrLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImagePlus className="w-3 h-3 mr-1" />}
                  Extract
                </Button>
                <span className="text-[9px] font-medium uppercase tracking-wider text-amber-400/70">Experimental</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="w-3 h-3 mr-1" />
                  Upload image
                </Button>
                <span className="text-[9px] font-medium uppercase tracking-wider text-amber-400/70">Experimental</span>
              </div>
            )}
            {dragOver && (
              <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/30 bg-white/10 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Drop image here</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Button size="sm" onClick={handleResearch} disabled={researching || ocrLoading || text.trim().length < 10}>
              {researching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Search className="w-3.5 h-3.5 mr-1.5" />}
              Investigate
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {researching && (
        <div className="flex items-center gap-3 px-4 py-6 rounded-xl border border-white/10 bg-white/5">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Analyzing event</p>
            <p className="text-xs text-muted-foreground">Parsing details, searching sources, scoring risk...</p>
          </div>
        </div>
      )}

      {hasResults && auditResult && (() => {
        const vm = verdictMeta(auditResult.score);
        return (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <button type="button" onClick={() => setVerdictOpen(!verdictOpen)} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${vm.dotClass}`} />
                <span className="text-sm font-medium">{vm.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${vm.badgeClass}`}>{auditResult.score}/100</span>
                {verdictOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </button>
            {verdictOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  {auditResult.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-2">
                      <CheckIcon status={check.status} />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground">{check.label}</span>
                        <span className="text-muted-foreground"> — {check.detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">{auditResult.summary}</p>
                {auditResult.suggestions.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    {auditResult.suggestions.map((s, i) => (
                      <div key={i} className={`text-xs px-2.5 py-1.5 rounded-md ${s.severity === 'critical' ? 'bg-red-500/10 text-red-400' : s.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/10 text-muted-foreground'}`}>{s.text}</div>
                    ))}
                  </div>
                )}
                {auditResult.venueFacts.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <button type="button" onClick={() => setVenueOpen(!venueOpen)} className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 hover:text-muted-foreground">
                      {venueOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      Venue
                    </button>
                    {venueOpen && (
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                        {auditResult.venueFacts.map((f, i) => (
                          <div key={i} className="flex items-baseline justify-between text-xs">
                            <span className="text-muted-foreground">{f.label}</span>
                            <span className="text-foreground font-medium">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {v && (
                  <div className="pt-2 border-t border-white/10">
                    <button type="button" onClick={() => setBreakdownOpen(!breakdownOpen)} className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 hover:text-muted-foreground">
                      {breakdownOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      Score Breakdown
                    </button>
                    {breakdownOpen && (
                      <div className="mt-2.5 space-y-2">
                        <ScoreBreakdownBar label="Overall" score={v.score} maxScore={100} />
                        <ScoreBreakdownBar label="Traffic" score={Math.round(v.factors.trafficScore * 100)} maxScore={100} />
                        <ScoreBreakdownBar label="Research" score={Math.round(v.factors.researchConfidence * 100)} maxScore={100} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Area Density</span>
                          <span>{v.factors.areaEventCount == null ? 'N/A' : `${v.factors.areaEventCount} within 10mi`}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Recurring</span>
                          <span>{v.factors.recurringCount == null ? 'N/A' : v.factors.recurringCount === 0 ? 'First-time' : `${v.factors.recurringCount}x prior`}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {hasResults && p && (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-snug">{p.name}</h4>
            {p.category && (
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {p.category}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3 text-muted-foreground" />
              <span className={p.date ? 'text-foreground' : 'text-muted-foreground'}>
                {p.date ? formatDate(p.date) : 'No date'}
                {p.endDate && p.endDate !== p.date && <span> — {formatDate(p.endDate)}</span>}
              </span>
            </span>

            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className={(p.location.address || p.location.city) ? 'text-foreground' : 'text-muted-foreground'}>
                {[p.location.address, p.location.city, p.location.state].filter(Boolean).join(', ') || 'No location'}
              </span>
            </span>

            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className={(p.time.start || p.time.end) ? 'text-foreground' : 'text-muted-foreground'}>
                {p.time.start || p.time.end ? `${p.time.start ?? '?'} — ${p.time.end ?? '?'}` : 'No hours'}
              </span>
            </span>

            {p.expectedAttendance != null && p.expectedAttendance > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">~{p.expectedAttendance.toLocaleString()}</span>
              </span>
            )}

            {p.contactInfo.phone && (
              <span className={`flex items-center gap-1.5 ${result?.evidence?.phoneVerification?.status === 'validated' ? 'text-green-400' : result?.evidence?.phoneVerification?.status === 'mismatch' ? 'text-amber-400' : 'text-foreground'}`}>
                <Phone className="w-3 h-3 shrink-0" />
                {p.contactInfo.phone}
                {result?.evidence?.phoneVerification?.status === 'validated' && (
                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                )}
                {result?.evidence?.phoneVerification?.status === 'mismatch' && (
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </span>
            )}

            {p.contactInfo.website && (
              <a
                href={p.contactInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-400 truncate max-w-[200px]"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                {extractDomain(p.contactInfo.website)}
              </a>
            )}
          </div>
        </div>
      )}

      {hasResults && (v || result.sources.length > 0) && (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setEvidenceOpen(!evidenceOpen)}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Evidence
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {result.evidence ? (
                <>
                  {result.evidence.taggedSources.some((s) => s.tag !== 'off-topic') && (
                    <span>{result.evidence.taggedSources.filter((s) => s.tag !== 'off-topic').length} found</span>
                  )}
                  {result.evidence.droppedSourceCount > 0 && (
                    <span className="text-muted-foreground/60">{result.evidence.droppedSourceCount} off-topic</span>
                  )}
                  {result.evidence.overallConfidence > 0 && (
                    <span className={`font-semibold ${result.evidence.overallConfidence >= 0.6 ? 'text-green-400' : result.evidence.overallConfidence >= 0.3 ? 'text-amber-400' : 'text-red-400'}`}>
                      {Math.round(result.evidence.overallConfidence * 100)}%
                    </span>
                  )}
                </>
              ) : (
                <span>{result.sources.length} source{result.sources.length === 1 ? '' : 's'}</span>
              )}
              {evidenceOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          </button>

          {evidenceOpen && (
            <div className="px-4 pb-4 space-y-3">
              {result.evidence?.phoneVerification && result.evidence.phoneVerification.status !== 'skipped' && (
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                  result.evidence.phoneVerification.status === 'validated'
                    ? 'bg-green-500/10 text-green-400'
                    : result.evidence.phoneVerification.status === 'mismatch'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-white/10 text-muted-foreground'
                }`}>
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>
                    {(() => {
                      const pv = result.evidence.phoneVerification;
                      if (pv.status === 'validated') {
                        const venue = pv.venueName ? ` — ${pv.venueName}` : '';
                        return `Phone matches venue${venue}`;
                      }
                      if (pv.status === 'mismatch') return 'Phone may not belong to this venue';
                      return 'Phone check unavailable — try contacting the venue directly';
                    })()}
                  </span>
                </div>
              )}

              {v?.reasoning && (
                <ul className="space-y-1">
                  {v.reasoning.split(';').map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                      {r.trim()}
                    </li>
                  ))}
                </ul>
              )}

              {result.evidence && result.evidence.taggedSources.some((s) => s.tag !== 'off-topic') ? (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {result.evidence.taggedSources
                    .filter((s) => s.tag !== 'off-topic')
                    .map((tagged, i) => (
                      <div key={i} className="group">
                        <div className="flex items-center gap-2">
                          {tagged.tag === 'relevant' ? (
                            <BadgeCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <a
                            href={tagged.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                          >
                            {tagged.source.title}
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                          <span className={`text-[10px] font-medium uppercase tracking-wider shrink-0 ${
                            tagged.tag === 'relevant'
                              ? 'text-green-400/80'
                              : 'text-amber-400/80'
                          }`}>
                            {tagged.tag}
                          </span>
                        </div>
                        {tagged.verification.supportingQuotes.length > 0 && (
                          <div className="mt-1 ml-5.5 space-y-0.5">
                            {tagged.verification.supportingQuotes.slice(0, 3).map((quote, qi) => (
                              <p key={qi} className="text-[11px] text-muted-foreground/80 italic line-clamp-2">
                                &ldquo;{quote}&rdquo;
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : result.sources.length > 0 ? (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  {result.sources.map((source, i) => (
                    <div key={i} className="group">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                      >
                        {source.title}
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      {source.snippet && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{source.snippet}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {result.evidence && result.evidence.droppedSourceCount > 0 && (
                <details className="pt-2 border-t border-white/10">
                  <summary className="text-[11px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    {result.evidence.droppedSourceCount} off-topic source{result.evidence.droppedSourceCount === 1 ? '' : 's'} hidden
                  </summary>
                </details>
              )}

              {result.evidence && result.evidence.criticalClaimsCoverage > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Fingerprint className="w-3 h-3 shrink-0" />
                    <span>
                      {result.evidence.isNameFragment
                        ? 'Partial match — no event name to verify against'
                        : `${result.evidence.taggedSources.filter((s) => s.tag === 'relevant').length} source${result.evidence.taggedSources.filter((s) => s.tag === 'relevant').length === 1 ? '' : 's'} with strong matches — click through to confirm`}
                    </span>
                  </div>
                </div>
              )}

              {v?.sources && v.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-white/10">
                  {v.sources.map((s, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground bg-white/10 rounded px-1.5 py-0.5">
                      {extractDomain(s)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasResults && onSwitchTab && (
        <button
          type="button"
          onClick={() => onSwitchTab('quick-check')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors text-left group"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground/90">Want to go deeper?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Run the Quick Check for a hands-on assessment of distance, fees, permits, and competition.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
        </button>
      )}
    </div>
  );
}
