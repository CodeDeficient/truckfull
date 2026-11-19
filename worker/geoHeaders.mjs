export const GEO_HEADER_NAMES = [
  'cf-ip-latitude',
  'cf-ip-longitude',
  'cf-ip-city',
  'cf-ip-country',
  'cf-region-code',
];

const CF_FIELD_TO_HEADER = {
  latitude: 'cf-ip-latitude',
  longitude: 'cf-ip-longitude',
  city: 'cf-ip-city',
  country: 'cf-ip-country',
  regionCode: 'cf-region-code',
};

export function buildClientLocationHeaders(cf) {
  const headers = {};
  if (!cf) return headers;

  for (const [field, header] of Object.entries(CF_FIELD_TO_HEADER)) {
    const value = cf[field];
    if (typeof value === 'string' && value.length > 0) {
      headers[header] = value;
    }
  }

  return headers;
}

export function withClientLocationHeaders(request, cf) {
  const headers = new Headers(request.headers);

  for (const name of GEO_HEADER_NAMES) {
    headers.delete(name);
  }

  for (const [name, value] of Object.entries(buildClientLocationHeaders(cf))) {
    headers.set(name, value);
  }

  return new Request(request, { headers });
}
