import { describe, it, expect } from '@jest/globals';
import { getStatusLabel } from '@/components/owner/PostProcessingHistory';

describe('getStatusLabel (owner-facing post status)', () => {
  it('returns Applied for processed status', () => {
    expect(getStatusLabel('processed')).toBe('Applied');
  });

  it('returns Needs Confirmation for pending_confirmation status', () => {
    expect(getStatusLabel('pending_confirmation')).toBe('Needs Confirmation');
  });

  it('returns Needs Review for pending_review status', () => {
    expect(getStatusLabel('pending_review')).toBe('Needs Review');
  });

  it('returns Rejected for rejected status', () => {
    expect(getStatusLabel('rejected')).toBe('Rejected');
  });

  it('returns Failed for failed status', () => {
    expect(getStatusLabel('failed')).toBe('Failed');
  });

  it('returns Pending for pending status', () => {
    expect(getStatusLabel('pending')).toBe('Pending');
  });

  it('returns the raw status for unknown values', () => {
    expect(getStatusLabel('something_new')).toBe('something_new');
  });
});