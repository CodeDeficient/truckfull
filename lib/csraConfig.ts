// lib/csraConfig.ts

// CSRA (Central Savannah River Area) cities to target for autonomous discovery
export const CSRA_TARGET_CITIES = [
  'Augusta',
  'Martinez',
  'Evans',
  'Grovetown',
  'Gonzales',
  'Lincolnton',
  'Wrens',
  'Norwood',
  'Camak',
  'Aiken',
  'North Augusta',
  'Jackson',
  'Thomson',
  'Sycamore',
  'Warrenton',
  'Stapleton',
  'Edgefield',
  'Johnston',
  'Trenton',
  'Bartow',
];

// CSRA Discovery configuration
export const CSRA_DISCOVERY_CONFIG = {
  maxUrlsPerRun: 50,
  maxDepthCrawl: 2,
  searchResultsLimit: 15,
  batchSize: 10,
  rateLimitDelayMs: 1000,
};
