import { extractVenue } from '@/lib/research/extractVenue';
import { classifyDomainAuthority } from '@/lib/research/sourceAuthority';
import {
  classifyLocationCompleteness,
  isBarePlaceholder,
} from '@/lib/research/locationCompleteness';
import { isLowConfidenceName } from '@/lib/research/textQuality';
import type { PhoneVerificationResult } from '@/lib/research/verifyPhone';

const FOOD_TRUCK_TERM = /\bfood\s*truck/i;
const FOOD_VENDOR_TERM = /\bfood\s*vend/i;

export interface AuditCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
  icon: string;
}

export interface AiSuggestion {
  text: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface VenueFact {
  label: string;
  value: string;
  source: 'phone' | 'email' | 'website' | 'vetting';
}

export interface AuditResult {
  checks: AuditCheck[];
  score: number;
  summary: string;
  suggestions: AiSuggestion[];
  venueFacts: VenueFact[];
}


interface EvidenceData {
  overallConfidence: number;
  criticalClaimsCoverage: number;
  confirmedCount: number;
  tangentialCount: number;
  droppedSourceCount: number;
  isNameFragment?: boolean;
  expectedAttendance?: number | null;
  phoneVerification: PhoneVerificationResult | null;
  emailVerification?: PhoneVerificationResult | null;
  websiteVerification?: PhoneVerificationResult | null;
}

interface AuditContext {
  parsed: {
    name: string;
    date: string | null;
    endDate: string | null;
    location: { address: string | null; city: string | null; state: string | null };
    time: { start: string | null; end: string | null };
    category: string | null;
    expectedAttendance: number | null;
    contactInfo: { phone: string | null; email: string | null; website: string | null };
    confidence: number;
  } | null;
  vetting: {
    score: number;
    factors: {
      trafficScore: number;
      researchConfidence: number;
      historyScore: number;
      areaEventCount: number;
      venuePopularity?: number;
      recurringCount: number;
    };
    recommendation: string;
    reasoning: string;
    sources: string[];
  } | null;
  searchConfidence: number;
  sourceCount: number;
  rawText: string;
  evidence: EvidenceData | null;
}

function scoreLabel(value: number): string {
  if (value >= 0.7) return 'Strong';
  if (value >= 0.4) return 'Moderate';
  return 'Low';
}

function isExpiredEvent(date: string | null): boolean {
  if (!date) return false;
  const eventEnd = new Date(date);
  if (eventEnd < new Date('2020-01-01')) return false;
  return eventEnd < new Date();
}

function daysUntilEvent(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatLocalDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}

function makeDateRange(p: NonNullable<AuditContext['parsed']>): string {
  const start = p.date
    ? formatLocalDate(p.date, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const end = p.endDate && p.endDate !== p.date
    ? formatLocalDate(p.endDate, { month: 'long', day: 'numeric' })
    : null;
  if (start && end) return `${start} — ${end}`;
  if (start) return start;
  return '';
}

function makeLocationDetail(
  venue: string | null,
  city: string | null,
  state: string | null,
): string {
  if (venue) {
    const parts = [venue];
    if (city) parts.push(city);
    if (state) parts.push(state);
    return parts.join(', ');
  }
  if (city) {
    const parts = [`City only: ${city}`];
    if (state) parts.push(state);
    parts.push('— no specific venue');
    return parts.join(', ');
  }
  return 'No location found in the event text';
}

export function runAudit(ctx: AuditContext): AuditResult {
  const checks: AuditCheck[] = [];
  const p = ctx.parsed;
  const v = ctx.vetting;

  if (!p) {
    return {
      checks: [{ id: 'parse', label: 'Event text parsing', status: 'fail', detail: 'Could not parse event details from the provided text', icon: 'file-text' }],
      score: 0,
      summary: 'Unable to audit — event text could not be parsed.',
      suggestions: [{ text: 'Try pasting clearer event details or a higher-quality image.', severity: 'critical' }],
      venueFacts: [],
    };
  }

  checks.push({
    id: 'date_verified',
    label: 'Event date',
    status: p.date ? 'pass' : 'fail',
    detail: p.date ? makeDateRange(p) : 'No date found in the event text',
    icon: 'calendar',
  });

  if (!p.name || ctx.evidence?.isNameFragment) {
    checks.push({
      id: 'name_missing',
      label: 'Event name not identified',
      status: 'warn',
      detail: 'No specific event name found — corroboration confidence capped at 60% since sources can\'t be verified against a named event',
      icon: 'fingerprint',
    });
  } else if (isLowConfidenceName(p.name, p.confidence)) {
    checks.push({
      id: 'name_garbled',
      label: 'Event name may be misread',
      status: 'warn',
      detail: `"${p.name}" may be garbled by OCR — verify against the flyer image`,
      icon: 'eye',
    });
  }

  const days = daysUntilEvent(p.date);
  if (days !== null) {
    if (isExpiredEvent(p.endDate ?? p.date)) {
      checks.push({ id: 'date_valid', label: 'Event is upcoming', status: 'fail', detail: 'This event appears to have already occurred', icon: 'alert-triangle' });
    } else if (days <= 0) {
      checks.push({ id: 'date_valid', label: 'Event is upcoming', status: 'warn', detail: 'Event is today or very soon — limited preparation time', icon: 'clock' });
    } else if (days <= 3) {
      const suffix = days === 1 ? '' : 's';
      checks.push({ id: 'date_valid', label: 'Event is upcoming', status: 'warn', detail: `Only ${days} day${suffix} away — decide quickly`, icon: 'clock' });
    } else {
      checks.push({ id: 'date_valid', label: 'Event is upcoming', status: 'pass', detail: `${days} days away — adequate time to prepare`, icon: 'clock' });
    }
  }

  const venue = p.location.address || extractVenue(ctx.rawText);
  const locationCompleteness = classifyLocationCompleteness(
    venue, p.location.city, p.location.state,
  );
  const locationStatus: AuditCheck['status'] = locationCompleteness === 'full'
    ? 'pass'
    : locationCompleteness === 'partial'
      ? 'warn'
      : 'fail';

  let locationDetail = makeLocationDetail(venue, p.location.city, p.location.state);
  if (venue && isBarePlaceholder(venue)) {
    locationDetail = `Generic venue: "${venue}" — no street address found. Verify exact location manually.`;
  }
  const timeStatus: AuditCheck['status'] = (p.time.start || p.time.end) ? 'pass' : 'warn';
  const timeDetail = (p.time.start || p.time.end)
    ? `${p.time.start ?? '?'} — ${p.time.end ?? '?'}`
    : 'No specific hours found — contact organizer';

  checks.push(
    {
      id: 'location_verified',
      label: 'Location',
      status: locationStatus,
      detail: locationDetail,
      icon: 'map-pin',
    },
  );

  if (p.contactInfo.phone) {
    const pv = ctx.evidence?.phoneVerification;
    const phoneStatus: AuditCheck['status'] = pv?.status === 'validated'
      ? 'pass'
      : 'warn';
    let phoneDetail = p.contactInfo.phone;
    if (pv && pv.status === 'mismatch') {
      phoneDetail += ` — belongs to ${pv.venueName ?? 'someone else'}`;
    } else if (pv && pv.status === 'validated') {
      phoneDetail += ` — matches ${pv.venueName ?? 'the venue'}`;
    }
    checks.push({
      id: 'organizer_phone',
      label: 'Organizer phone',
      status: phoneStatus,
      detail: phoneDetail,
      icon: 'phone',
    });
  }

  if (ctx.evidence?.phoneVerification?.venuePhone) {
    checks.push({
      id: 'venue_phone',
      label: 'Venue phone',
      status: 'pass',
      detail: ctx.evidence.phoneVerification.venuePhone,
      icon: 'building',
    });
  }

  if (p.contactInfo.email) {
    checks.push({
      id: 'organizer_email',
      label: 'Organizer email',
      status: ctx.evidence?.emailVerification?.status === 'validated' ? 'pass' : 'warn',
      detail: p.contactInfo.email,
      icon: 'mail',
    });
  }

  if (p.contactInfo.website) {
    checks.push({
      id: 'organizer_website',
      label: 'Organizer website',
      status: ctx.evidence?.websiteVerification?.status === 'validated' ? 'pass' : 'warn',
      detail: p.contactInfo.website,
      icon: 'globe',
    });
  }

  if (!p.contactInfo.phone && !p.contactInfo.email && !p.contactInfo.website) {
    checks.push({
      id: 'contact_verified',
      label: 'Organizer contact',
      status: 'fail',
      detail: 'No contact information found',
      icon: 'phone',
    });
  }

  checks.push({
      id: 'time_verified',
      label: 'Operating hours',
      status: timeStatus,
      detail: timeDetail,
      icon: 'clock',
    },
  );

  if (v) {
    const recurringSuffix = v.factors.recurringCount === 1 ? '' : 's';
    const recurringStatus: AuditCheck['status'] = v.factors.recurringCount >= 3 ? 'pass' : 'warn';
    const recurringDetail = v.factors.recurringCount > 0
      ? `Has occurred ${v.factors.recurringCount} time${recurringSuffix} before — ${v.factors.recurringCount >= 3 ? 'established event' : 'limited history'}`
      : 'First-time event — no historical attendance data available';

    checks.push(
      {
        id: 'traffic_score',
        label: 'DOT vehicle traffic',
        status: v.factors.trafficScore >= 0.5 ? 'pass' : v.factors.trafficScore >= 0.2 ? 'warn' : 'fail',
        detail: `${scoreLabel(v.factors.trafficScore)} vehicle traffic near this location (${Math.round(v.factors.trafficScore * 100)}%) — based on DOT average daily traffic counts`,
        icon: 'car',
      },
      {
        id: 'venue_foot_traffic',
        label: 'Venue popularity',
        status: (v.factors.venuePopularity ?? 0) >= 0.7 ? 'pass' : (v.factors.venuePopularity ?? 0) >= 0.4 ? 'warn' : 'skip',
        detail: (v.factors.venuePopularity ?? 0) > 0
          ? `${scoreLabel(v.factors.venuePopularity ?? 0)} venue popularity (${Math.round((v.factors.venuePopularity ?? 0) * 100)}%) — based on Foursquare foot traffic data for nearby venues`
          : 'No foot traffic data available',
        icon: 'footprints',
      },
      {
        id: 'recurring_event',
        label: 'Recurring event track record',
        status: recurringStatus,
        detail: recurringDetail,
        icon: 'repeat',
      },
    );

    if (v.sources && v.sources.length > 0) {
      const highAuthCount = v.sources.filter((url) => classifyDomainAuthority(url) === 'high').length;
      const status: AuditCheck['status'] = highAuthCount > 0
        ? 'pass'
        : v.sources.some((url) => classifyDomainAuthority(url) === 'medium')
          ? 'warn'
          : 'skip';

      let detail: string;
      if (highAuthCount > 0) {
        detail = `${highAuthCount} high-authority source${highAuthCount === 1 ? '' : 's'} (.gov, .edu, .mil) — strongly corroborated`;
      } else {
        const mediumCount = v.sources.filter((url) => classifyDomainAuthority(url) === 'medium').length;
        detail = `No high-authority sources found — ${mediumCount} medium-authority source${mediumCount === 1 ? '' : 's'} available`;
      }

      checks.push({
        id: 'source_authority',
        label: 'Source authority',
        status,
        detail,
        icon: 'shield',
      });

    }
  } else {
    checks.push({
      id: 'venue_foot_traffic',
      label: 'Venue popularity',
      status: 'skip' as const,
      detail: 'No foot traffic data — location not available for vetting',
      icon: 'footprints',
    });
  }

  const foodTruckMention = FOOD_TRUCK_TERM.test(ctx.rawText) || FOOD_VENDOR_TERM.test(ctx.rawText);
  checks.push({
    id: 'ft_friendly',
    label: 'Food truck friendly',
    status: foodTruckMention ? 'pass' : 'warn',
    detail: foodTruckMention
      ? 'Flyer explicitly mentions food trucks — confirmed vendor-friendly'
      : 'No explicit mention of food trucks — verify with organizer',
    icon: 'truck',
  });

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const totalCount = checks.filter((c) => c.status !== 'skip').length;
  const score = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

  return {
    checks,
    score,
    summary: generateSummary(checks),
    suggestions: generateSuggestions(checks, ctx),
    venueFacts: collectVenueFacts(ctx, v),
  };
}

function collectVenueFacts(ctx: AuditContext, v: AuditContext['vetting']): VenueFact[] {
  const facts: VenueFact[] = [];
  const ev = ctx.evidence;
  const p = ctx.parsed;
  if (!ev || !p) return facts;

  const seen = new Set<string>();

  function add(label: string, value: string | null, source: VenueFact['source']): void {
    if (!value || seen.has(label)) return;
    seen.add(label);
    facts.push({ label, value, source });
  }

  const venueName = p.location.address || extractVenue(ctx.rawText);
  if (venueName) add('Name', venueName, 'phone');

  const pv = ev.phoneVerification;
  if (pv && pv.status !== 'skipped') {
    add('Phone', pv.venuePhone, 'phone');
  }

  if (v && v.factors.venuePopularity != null && v.factors.venuePopularity > 0) {
    add('Foot traffic', `${Math.round(v.factors.venuePopularity * 100)}th percentile`, 'vetting');
  }

  return facts;
}

function generateSummary(checks: AuditCheck[]): string {
  const fails = checks.filter((c) => c.status === 'fail');
  const warns = checks.filter((c) => c.status === 'warn');

  if (fails.length === 0 && warns.length === 0) return 'All checks passed — this event looks solid.';
  if (fails.length >= 3) return `Multiple issues detected (${fails.length} failures) — proceed with caution.`;
  if (fails.length > 0) {
    const suffix = fails.length === 1 ? '' : 's';
    return `${fails.length} issue${suffix} needs attention before committing.`;
  }
  const suffix = warns.length === 1 ? '' : 's';
  return `${warns.length} item${suffix} to verify — event looks promising but has gaps.`;
}

function generateSuggestions(checks: AuditCheck[], ctx: AuditContext): AiSuggestion[] {
  const suggestions: AiSuggestion[] = [];

  if (checks.some((c) => c.id === 'date_valid' && c.status === 'fail')) {
    suggestions.push({ text: 'This event has already passed. Skip it and look for upcoming opportunities.', severity: 'critical' });
  }

  if (checks.some((c) => c.id === 'location_verified' && c.status === 'fail')) {
    suggestions.push({ text: 'No location found — search for the event name online to find the venue before deciding.', severity: 'critical' });
  }

  if (ctx.evidence?.phoneVerification?.status === 'mismatch') {
    suggestions.push({ text: 'Phone number doesn\'t match the venue. Verify you\'re contacting the right organizer before sending payment.', severity: 'warning' });
  }

  if (ctx.evidence && ctx.evidence.confirmedCount === 0 && ctx.evidence.tangentialCount > 0) {
    suggestions.push({ text: 'Sources mention the area but not this specific event. The event may be real but not widely promoted — click through and verify yourself.', severity: 'info' });
  }

  if (ctx.evidence && ctx.evidence.droppedSourceCount > 2) {
    suggestions.push({ text: `${ctx.evidence.droppedSourceCount} off-topic sources filtered — the event name or details may be too generic to match precisely.`, severity: 'info' });
  }

  if (checks.some((c) => c.id === 'contact_verified' && c.status === 'fail')) {
    suggestions.push({ text: 'No contact info available — risky to commit without being able to reach the organizer.', severity: 'warning' });
  }

  if (ctx.vetting && ctx.vetting.factors.trafficScore < 0.2) {
    suggestions.push({ text: 'Low foot traffic area — expect fewer walk-up customers. Focus on pre-marketing if you go.', severity: 'info' });
  }

  if (checks.some((c) => c.id === 'ft_friendly' && c.status === 'warn')) {
    suggestions.push({ text: 'Flyer doesn\'t mention food trucks — confirm with organizer that vendor spots are available.', severity: 'warning' });
  }

  if (checks.some((c) => c.id === 'recurring_event' && c.detail.includes('First-time'))) {
    suggestions.push({ text: 'First-time event — attendance and logistics are unpredictable. Consider going as a trial before committing to a full setup.', severity: 'info' });
  }

  if (suggestions.length === 0) {
    suggestions.push({ text: 'Event data looks comprehensive — standard due diligence applies. Show up early and scout the layout.', severity: 'info' });
  }

  return suggestions.slice(0, 6);
}
