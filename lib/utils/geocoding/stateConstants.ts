const TWO_LETTER_CODE = /^[a-zA-Z]{2}$/;

export const STATE_NAME_TO_ABBREV: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

export const STATE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  SC: { minLat: 32, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
  GA: { minLat: 30.3, maxLat: 35, minLng: -85.6, maxLng: -80.8 },
  NC: { minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.5 },
  AL: { minLat: 30.1, maxLat: 35, minLng: -88.5, maxLng: -84.9 },
  TN: { minLat: 35, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
  FL: { minLat: 24.5, maxLat: 31, minLng: -87.6, maxLng: -80 },
  VA: { minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
  MS: { minLat: 30.1, maxLat: 35, minLng: -91.7, maxLng: -88.1 },
};

export const STATE_ABBREVIATIONS = new Set([
  ...Object.values(STATE_NAME_TO_ABBREV),
  ...Object.keys(STATE_BOUNDS),
]);

export function stateFromPhotonState(photonState: string | undefined): string | undefined {
  if (!photonState) return undefined;
  const normalized = photonState.toLowerCase();
  const fromName = STATE_NAME_TO_ABBREV[normalized];
  if (fromName) return fromName;
  if (TWO_LETTER_CODE.test(photonState) && STATE_ABBREVIATIONS.has(photonState.toUpperCase())) {
    return photonState.toUpperCase();
  }
  return undefined;
}
