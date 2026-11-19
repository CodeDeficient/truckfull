import { describe, it, expect, beforeAll } from '@jest/globals';
import type { AuditContext, AuditResult } from '@/lib/events/riskChecklist';

let runAudit: (ctx: AuditContext) => AuditResult;

beforeAll(async () => {
  const mod = await import('@/lib/events/riskChecklist');
  runAudit = mod.runAudit;
});

function baseContext(overrides?: Partial<AuditContext>): AuditContext {
  return {
    parsed: {
      name: 'Test Food Festival',
      date: '2026-06-15',
      endDate: null,
      location: { address: '123 Main St', city: 'Asheville', state: 'NC' },
      time: { start: '10:00 AM', end: '6:00 PM' },
      category: 'festival',
      expectedAttendance: 500,
      contactInfo: { phone: '(555) 123-4567', email: null, website: 'https://fest.test' },
      confidence: 0.9,
    },
    vetting: {
      score: 72,
      factors: {
        trafficScore: 0.6,
        researchConfidence: 0.5,
        historyScore: 0.7,
        areaEventCount: 8,
        recurringCount: 3,
        venuePopularity: 0,
      },
      recommendation: 'recommended',
      reasoning: 'Good traffic; strong corroboration; recurring event',
      sources: ['https://source1.test', 'https://source2.test'],
    },
    searchConfidence: 0.5,
    sourceCount: 2,
    rawText: 'Test Food Festival on June 15 at Asheville Mall. Food trucks welcome!',
    ...overrides,
  };
}

describe('runAudit', () => {
  it('returns score 0 when parsed is null', () => {
    const result = runAudit({ parsed: null, vetting: null, searchConfidence: 0, sourceCount: 0, rawText: '' });
    expect(result.score).toBe(0);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].status).toBe('fail');
  });

  it('returns a positive score for a complete event', () => {
    const result = runAudit(baseContext());
    expect(result.score).toBeGreaterThan(0);
    expect(result.checks.length).toBeGreaterThan(5);
  });

  it('every check has a unique id', () => {
    const result = runAudit(baseContext());
    const ids = result.checks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every check has a non-empty label and detail', () => {
    const result = runAudit(baseContext());
    for (const check of result.checks) {
      expect(check.label.length).toBeGreaterThan(0);
      expect(check.detail.length).toBeGreaterThan(0);
    }
  });

  it('fails date check when no date is provided', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, date: null },
    }));
    const dateCheck = result.checks.find((c) => c.id === 'date_verified');
    expect(dateCheck?.status).toBe('fail');
  });

  it('fails location check when no location info', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, location: { address: null, city: null, state: null } },
      rawText: 'Some event somewhere',
    }));
    const locCheck = result.checks.find((c) => c.id === 'location_verified');
    expect(locCheck?.status).toBe('fail');
  });

  it('warns on location with venue name but no street address', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, location: { address: null, city: 'Asheville', state: 'NC' } },
      rawText: 'Come to Asheville Mall for the event!',
    }));
    const locCheck = result.checks.find((c) => c.id === 'location_verified');
    expect(locCheck?.status).toBe('warn');
  });

  it('fails contact check when no contact info', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, contactInfo: { phone: null, email: null, website: null } },
    }));
    const contactCheck = result.checks.find((c) => c.id === 'contact_verified');
    expect(contactCheck?.status).toBe('fail');
  });

  it('warns contact check when contact found but unverified', () => {
    const result = runAudit(baseContext());
    const phoneCheck = result.checks.find((c) => c.id === 'organizer_phone');
    expect(phoneCheck?.status).toBe('warn');
  });

  it('passes contact check when phone verified', () => {
    const result = runAudit(baseContext({
      evidence: {
        overallConfidence: 0.8,
        criticalClaimsCoverage: 1,
        confirmedCount: 1,
        tangentialCount: 0,
        droppedSourceCount: 0,
        phoneVerification: { status: 'validated', venueName: 'Test Venue', venuePhone: null, carrier: null },
        emailVerification: null,
        websiteVerification: null,
      },
    }));
    const phoneCheck = result.checks.find((c) => c.id === 'organizer_phone');
    expect(phoneCheck?.status).toBe('pass');
    expect(phoneCheck?.detail).toContain('matches');
  });

  it('shows venue phone when poster phone is mismatch', () => {
    const result = runAudit(baseContext({
      evidence: {
        overallConfidence: 0.8,
        criticalClaimsCoverage: 1,
        confirmedCount: 1,
        tangentialCount: 0,
        droppedSourceCount: 0,
        phoneVerification: { status: 'mismatch', venueName: 'Test Venue', venuePhone: '(555) 999-0000', carrier: null },
        emailVerification: null,
        websiteVerification: null,
      },
    }));
    const phoneCheck = result.checks.find((c) => c.id === 'organizer_phone');
    expect(phoneCheck?.status).toBe('warn');
    expect(phoneCheck?.detail).toContain('belongs to');
    const venueCheck = result.checks.find((c) => c.id === 'venue_phone');
    expect(venueCheck?.detail).toContain('(555) 999-0000');
  });

  it('shows venue phone when poster phone is unverified', () => {
    const result = runAudit(baseContext({
      evidence: {
        overallConfidence: 0.5,
        criticalClaimsCoverage: 0.5,
        confirmedCount: 0,
        tangentialCount: 1,
        droppedSourceCount: 0,
        phoneVerification: { status: 'not_found', venueName: null, venuePhone: '(555) 999-0000', carrier: null },
        emailVerification: null,
        websiteVerification: null,
      },
    }));
    const venueCheck = result.checks.find((c) => c.id === 'venue_phone');
    expect(venueCheck?.detail).toContain('(555) 999-0000');
  });

  it('warns on food truck friendly when no mention in text', () => {
    const result = runAudit(baseContext({ rawText: 'Some festival event.' }));
    const ftCheck = result.checks.find((c) => c.id === 'ft_friendly');
    expect(ftCheck?.status).toBe('warn');
  });

  it('passes food truck friendly when mentioned in text', () => {
    const result = runAudit(baseContext({ rawText: 'Food trucks welcome!' }));
    const ftCheck = result.checks.find((c) => c.id === 'ft_friendly');
    expect(ftCheck?.status).toBe('pass');
  });

  it('includes suggestions when issues exist', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, contactInfo: { phone: null, email: null, website: null } },
    }));
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('generates a non-empty summary', () => {
    const result = runAudit(baseContext());
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('detects expired events', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, date: '2020-06-15', endDate: null },
    }));
    const dateValid = result.checks.find((c) => c.id === 'date_valid');
    expect(dateValid?.status).toBe('fail');
    expect(dateValid?.detail).toContain('already occurred');
  });

  it('works without vetting data', () => {
    const result = runAudit(baseContext({ vetting: null }));
    expect(result.score).toBeGreaterThan(0);
    expect(result.checks.every((c) => !['traffic_score', 'research_verified', 'overall_vetting'].includes(c.id))).toBe(true);
  });

  it('suggestions are capped at 6', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, date: '2020-01-01', contactInfo: { phone: null, email: null, website: null } },
      rawText: 'some event',
      searchConfidence: 0,
      sourceCount: 0,
    }));
    expect(result.suggestions.length).toBeLessThanOrEqual(6);
  });

  it('flags source authority as pass when .gov source present', () => {
    const result = runAudit(baseContext({
      vetting: {
        ...baseContext().vetting!,
        sources: ['https://www.ninetyisixsc.gov/events'],
      },
    }));
    const authorityCheck = result.checks.find((c) => c.id === 'source_authority');
    expect(authorityCheck).toBeDefined();
    expect(authorityCheck!.status).toBe('pass');
  });

  it('flags source authority as warn when no high-authority sources', () => {
    const result = runAudit(baseContext({
      vetting: {
        ...baseContext().vetting!,
        sources: ['https://www.eventbrite.com/e/event'],
      },
    }));
    const authorityCheck = result.checks.find((c) => c.id === 'source_authority');
    expect(authorityCheck).toBeDefined();
    expect(authorityCheck!.status).toBe('warn');
  });

  it('skips source authority when no sources available', () => {
    const result = runAudit(baseContext({
      vetting: {
        ...baseContext().vetting!,
        sources: [],
      },
    }));
    const authorityCheck = result.checks.find((c) => c.id === 'source_authority');
    expect(authorityCheck).toBeUndefined();
  });

  it('warns when location is a bare placeholder', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, location: { address: 'Day Market', city: '', state: '' } },
      rawText: 'Join us at Day Market for some food',
    }));
    const locationCheck = result.checks.find((c) => c.id === 'location_verified');
    expect(locationCheck).toBeDefined();
    expect(locationCheck!.status).toBe('warn');
  });

  it('passes when location has full street address', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, location: { address: '3027 MLK Blvd', city: 'Anderson', state: 'SC' } },
    }));
    const locationCheck = result.checks.find((c) => c.id === 'location_verified');
    expect(locationCheck!.status).toBe('pass');
  });

  it('fails when location is completely missing', () => {
    const result = runAudit(baseContext({
      parsed: { ...baseContext().parsed!, location: { address: '', city: '', state: '' } },
      rawText: 'Some event happening somewhere',
    }));
    const locationCheck = result.checks.find((c) => c.id === 'location_verified');
    expect(locationCheck!.status).toBe('fail');
  });
});
