import { describe, expect, it } from '@jest/globals';
import { classifyEventDetailPath } from '@/lib/events/eventDetailPath';

describe('classifyEventDetailPath', () => {
  it('recognizes a structurally valid event detail path', () => {
    expect(classifyEventDetailPath('/events/atlanta-ga/summer-festival-2026-08-01')).toBe('valid');
    expect(classifyEventDetailPath('/events/winston-salem-nc/food-truck-day-2026-08-01/')).toBe(
      'valid',
    );
    expect(classifyEventDetailPath(`/events/atlanta-ga/${'a'.repeat(59)}--2026-08-01`)).toBe(
      'valid',
    );
  });

  it('leaves event index and city paths to their existing routes', () => {
    expect(classifyEventDetailPath('/events')).toBe('not-event-detail');
    expect(classifyEventDetailPath('/events/')).toBe('not-event-detail');
    expect(classifyEventDetailPath('/events/atlanta-ga')).toBe('not-event-detail');
  });

  it('rejects malformed event detail paths before data access', () => {
    expect(classifyEventDetailPath('/events/atlanta-ga/not-an-event')).toBe('malformed');
    expect(classifyEventDetailPath('/events/atlanta-ga/summer-festival-2026-02-30')).toBe(
      'malformed',
    );
    expect(classifyEventDetailPath('/events/atlanta-ga/summer-festival-2026-08-01/extra')).toBe(
      'malformed',
    );
  });
});
