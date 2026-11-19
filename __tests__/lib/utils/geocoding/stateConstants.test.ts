/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import {
  STATE_NAME_TO_ABBREV,
  STATE_ABBREVIATIONS,
  stateFromPhotonState,
} from '@/lib/utils/geocoding/stateConstants';

describe('stateFromPhotonState', () => {
  it('maps full state name to abbreviation', () => {
    expect(stateFromPhotonState('Georgia')).toBe('GA');
    expect(stateFromPhotonState('South Carolina')).toBe('SC');
    expect(stateFromPhotonState('North Carolina')).toBe('NC');
    expect(stateFromPhotonState('New York')).toBe('NY');
    expect(stateFromPhotonState('District of Columbia')).toBe('DC');
  });

  it('maps already-abbreviated state codes', () => {
    expect(stateFromPhotonState('GA')).toBe('GA');
    expect(stateFromPhotonState('SC')).toBe('SC');
    expect(stateFromPhotonState('NC')).toBe('NC');
    expect(stateFromPhotonState('FL')).toBe('FL');
  });

  it('returns undefined for undefined input', () => {
    expect(stateFromPhotonState(undefined)).toBe(undefined);
  });

  it('returns undefined for unrecognized state name', () => {
    expect(stateFromPhotonState('Baden-Württemberg')).toBe(undefined);
  });

  it('handles lower-case and mixed-case state names', () => {
    expect(stateFromPhotonState('georgia')).toBe('GA');
    expect(stateFromPhotonState('SOUTH CAROLINA')).toBe('SC');
  });
});

describe('STATE_NAME_TO_ABBREV', () => {
  it('contains all 51 entries (50 states + DC)', () => {
    const values = Object.values(STATE_NAME_TO_ABBREV);
    expect(values).toHaveLength(51);
  });

  it('maps multi-word state names correctly', () => {
    expect(STATE_NAME_TO_ABBREV['south carolina']).toBe('SC');
    expect(STATE_NAME_TO_ABBREV['north carolina']).toBe('NC');
    expect(STATE_NAME_TO_ABBREV['new york']).toBe('NY');
    expect(STATE_NAME_TO_ABBREV['new hampshire']).toBe('NH');
    expect(STATE_NAME_TO_ABBREV['new jersey']).toBe('NJ');
    expect(STATE_NAME_TO_ABBREV['new mexico']).toBe('NM');
    expect(STATE_NAME_TO_ABBREV['west virginia']).toBe('WV');
    expect(STATE_NAME_TO_ABBREV['rhode island']).toBe('RI');
    expect(STATE_NAME_TO_ABBREV['north dakota']).toBe('ND');
    expect(STATE_NAME_TO_ABBREV['south dakota']).toBe('SD');
    expect(STATE_NAME_TO_ABBREV['district of columbia']).toBe('DC');
  });
});

describe('STATE_ABBREVIATIONS', () => {
  it('contains all standard abbreviations', () => {
    expect(STATE_ABBREVIATIONS.has('SC')).toBe(true);
    expect(STATE_ABBREVIATIONS.has('GA')).toBe(true);
    expect(STATE_ABBREVIATIONS.has('NC')).toBe(true);
    expect(STATE_ABBREVIATIONS.has('FL')).toBe(true);
  });
});