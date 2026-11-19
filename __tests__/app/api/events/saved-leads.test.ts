import { describe, it, expect } from '@jest/globals';

import { classifyInsertError } from '@/app/api/events/saved-leads/route';

interface PostgrestError {
  code: string;
  message: string;
  details?: string | null;
}

describe('classifyInsertError', () => {
  it('returns limit_reached for trigger check_violation (23514)', () => {
    const error = {
      code: '23514',
      message: 'Saved lead limit reached (5)',
      details: null,
    } as PostgrestError;

    const result = classifyInsertError(error);
    expect(result).toEqual({
      type: 'limit_reached',
      status: 403,
      body: { error: 'Lead limit reached (5 for your subscription tier)', code: 'LIMIT_REACHED' },
    });
  });

  it('returns limit_reached for trigger with custom message', () => {
    const error = {
      code: '23514',
      message: 'Saved lead limit reached (100)',
      details: null,
    } as PostgrestError;

    const result = classifyInsertError(error);
    expect(result).toEqual({
      type: 'limit_reached',
      status: 403,
      body: { error: 'Lead limit reached (100 for your subscription tier)', code: 'LIMIT_REACHED' },
    });
  });

  it('returns unique_violation for duplicate save (23505)', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "saved_external_leads_unique"',
      details: 'Key (event_id, truck_id)=(...) already exists.',
    } as PostgrestError;

    const result = classifyInsertError(error);
    expect(result).toEqual({
      type: 'already_saved',
      status: 200,
      body: { message: 'Lead already saved' },
    });
  });

  it('returns fk_violation for invalid event_id (23503)', () => {
    const error = {
      code: '23503',
      message: 'insert or update on table "saved_external_leads" violates foreign key constraint',
      details: null,
    } as PostgrestError;

    const result = classifyInsertError(error);
    expect(result).toEqual({
      type: 'not_found',
      status: 400,
      body: { error: 'Event or truck not found' },
    });
  });

  it('returns generic_error for unrecognized errors', () => {
    const error = {
      code: '42P01',
      message: 'relation "saved_external_leads" does not exist',
      details: null,
    } as PostgrestError;

    const result = classifyInsertError(error);
    expect(result).toEqual({
      type: 'generic_error',
      status: 500,
      body: { error: 'Failed to save lead' },
    });
  });

  it('returns null for null error', () => {
    expect(classifyInsertError(null)).toBeNull();
  });

  it('returns null for undefined error', () => {
    expect(classifyInsertError(undefined)).toBeNull();
  });
});
