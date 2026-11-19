export const STATE_NAME_SUFFIXES = {
  'south-carolina': 'sc',
  'north-carolina': 'nc',
  georgia: 'ga',
  alabama: 'al',
};

export const LEGACY_CITY_SLUGS = {
  'charleston-market-sc': 'charleston-sc',
};

export const cityRedirects = [
  ...Object.entries(STATE_NAME_SUFFIXES).map(([name, abbr]) => ({
    source: `/city/:city([a-z0-9-]+)-${name}`,
    destination: `/city/:city-${abbr}`,
    permanent: true,
  })),
  ...Object.entries(LEGACY_CITY_SLUGS).map(([from, to]) => ({
    source: `/city/${from}`,
    destination: `/city/${to}`,
    permanent: true,
  })),
];
