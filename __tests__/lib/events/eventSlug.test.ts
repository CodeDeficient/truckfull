import { describe, it, expect } from '@jest/globals';
import { slugifyEventTitle, buildEventSlug, parseEventSlug } from '@/lib/events/eventSlug';

describe('slugifyEventTitle', () => {
  it('converts a basic title to a slug', () => {
    expect(slugifyEventTitle('Food Truck Friday')).toBe('food-truck-friday');
  });

  it('removes special characters but keeps word chars and hyphens', () => {
    expect(slugifyEventTitle('Taco & Burrito! Fest 2026')).toBe('taco-burrito-fest-2026');
  });

  it('collapses multiple hyphens', () => {
    expect(slugifyEventTitle('A   B   C')).toBe('a-b-c');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugifyEventTitle('--trimmed--')).toBe('trimmed');
  });

  it('truncates titles to 60 characters', () => {
    const long = 'A'.repeat(120);
    expect(slugifyEventTitle(long)).toHaveLength(60);
  });

  it('handles empty string', () => {
    expect(slugifyEventTitle('')).toBe('');
  });

  it('lowercases uppercase titles', () => {
    expect(slugifyEventTitle('UPPERCASE TITLE')).toBe('uppercase-title');
  });

  it('preserves digits and underscores', () => {
    expect(slugifyEventTitle('Event_42 Live')).toBe('event_42-live');
  });
});

describe('buildEventSlug', () => {
  it('combines a title slug and ISO date', () => {
    expect(buildEventSlug('Food Truck Friday', '2026-07-04')).toBe(
      'food-truck-friday-2026-07-04',
    );
  });

  it('handles recurring events with the same title but different dates', () => {
    expect(buildEventSlug('Food Truck Friday', '2026-07-04')).not.toBe(
      buildEventSlug('Food Truck Friday', '2026-07-11'),
    );
  });

  it('throws when the title slugifies to an empty string', () => {
    expect(() => buildEventSlug('!@#$', '2026-07-04')).toThrow(/empty title/);
  });
});

describe('parseEventSlug', () => {
  it('parses a valid event slug', () => {
    expect(parseEventSlug('food-truck-friday-2026-07-04')).toEqual({
      titleSlug: 'food-truck-friday',
      date: '2026-07-04',
    });
  });

  it('parses a slug whose title portion contains digits', () => {
    expect(parseEventSlug('event-42-live-2026-12-31')).toEqual({
      titleSlug: 'event-42-live',
      date: '2026-12-31',
    });
  });

  it('returns null when no date suffix is present', () => {
    expect(parseEventSlug('food-truck-friday')).toBeNull();
  });

  it('returns null when the date is malformed', () => {
    expect(parseEventSlug('food-truck-friday-2026-7-4')).toBeNull();
    expect(parseEventSlug('food-truck-friday-26-07-04')).toBeNull();
  });

  it('returns null for an empty slug', () => {
    expect(parseEventSlug('')).toBeNull();
  });

  it('parses a slug with a single-word title', () => {
    expect(parseEventSlug('festival-2026-10-01')).toEqual({
      titleSlug: 'festival',
      date: '2026-10-01',
    });
  });
});