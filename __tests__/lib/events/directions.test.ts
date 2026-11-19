import { formatDrivingDistance, formatDrivingDuration } from '@/lib/events/directions';

describe('formatDrivingDistance', () => {
  it('returns "~328 ft" for 100 meters', () => {
    expect(formatDrivingDistance(100)).toBe('~328 ft');
  });

  it('returns "~1.0 mi" for 1609 meters', () => {
    expect(formatDrivingDistance(1609)).toBe('~1.0 mi');
  });

  it('returns "~10.0 mi" for 16090 meters', () => {
    expect(formatDrivingDistance(16090)).toBe('~10.0 mi');
  });
});

describe('formatDrivingDuration', () => {
  it('returns "<1 min" for 30 seconds', () => {
    expect(formatDrivingDuration(30)).toBe('<1 min');
  });

  it('returns "5 min" for 300 seconds', () => {
    expect(formatDrivingDuration(300)).toBe('5 min');
  });

  it('returns "1h 30m" for 5400 seconds', () => {
    expect(formatDrivingDuration(5400)).toBe('1h 30m');
  });
});
