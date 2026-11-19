import { cleanEventDescription } from '@/lib/events/descriptionUtils';

describe('cleanEventDescription', () => {
  it('should return null for null input', () => {
    expect(cleanEventDescription(null)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(cleanEventDescription('')).toBeNull();
  });

  it('should return null for whitespace-only string', () => {
    expect(cleanEventDescription('   \n\t  ')).toBeNull();
  });

  it('should preserve short clean descriptions', () => {
    const desc = 'Join us for a fun community event!';
    expect(cleanEventDescription(desc)).toBe(desc);
  });

  it('should truncate long descriptions at sentence boundary', () => {
    const desc =
      'First sentence here. Second sentence with more detail. Third sentence continues. Fourth sentence. Fifth sentence adds more. Sixth sentence. Seventh. Eighth. Ninth. Tenth sentence with even more content to push past the limit of four hundred characters which is the maximum we want to display for any event description in the UI.';
    const result = cleanEventDescription(desc);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(400);
    expect(result!.endsWith('.')).toBe(true);
  });

  it('should remove trailing "Follow us on Facebook" CTA', () => {
    const desc = 'Great community festival with food and music. Follow us on Facebook for updates!';
    const result = cleanEventDescription(desc);
    expect(result).not.toContain('Follow us on Facebook');
  });

  it('should remove trailing "Visit our website" CTA', () => {
    const desc =
      'Annual food truck rally in downtown Savannah. Visit our website at example.com for details.';
    const result = cleanEventDescription(desc);
    expect(result).not.toContain('Visit our website');
  });

  it('should remove trailing "For more information" CTA', () => {
    const desc =
      'Join us for a day of family fun and live entertainment. For more information, contact the organizers.';
    const result = cleanEventDescription(desc);
    expect(result).not.toContain('For more information');
  });

  it('should collapse multiple newlines', () => {
    const desc = 'Line one.\n\n\n\nLine two.';
    expect(cleanEventDescription(desc)).toBe('Line one.\n\nLine two.');
  });

  it('should collapse excessive horizontal whitespace', () => {
    const desc = 'Hello     world   test';
    expect(cleanEventDescription(desc)).toBe('Hello world test');
  });

  it('should remove "Stay tuned" CTA', () => {
    const desc = 'Awesome music festival coming to town! Stay tuned for more details.';
    const result = cleanEventDescription(desc);
    expect(result).not.toContain('Stay tuned');
  });

  it('should handle descriptions that are mostly CTA', () => {
    const desc = 'Food truck event. Like us on Instagram @example and tag us in your photos!';
    const result = cleanEventDescription(desc);
    expect(result).toContain('Food truck event');
  });
});
