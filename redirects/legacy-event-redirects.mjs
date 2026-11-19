// Legacy redirects for historical event URLs that are no longer live on the site.
// These events were previously published and indexed by search engines, but are now
// ineligible (hidden, low-vetting, or not-food-truck-relevant). Each redirects to its
// city hub to preserve link equity and avoid 404s for backlinks/bookmarks.
//
// IMPORTANT: This file is FROZEN. Do NOT regenerate from the database.
// Live canonicalization is determined dynamically from the database at request time.
// This file only exists for historical compatibility with URLs that were once published.
//
// Corrected 2026-07-21: removed 28 false-positive entries that were live events
// misclassified as dead due to a multi-word city slug bug in the original generation.
// See PR #923 (original) and commit f996d845 (correction).
//
// Generated: 2026-07-21
//
const legacyEventRedirects = [
  {"source":"/events/aiken-county-sc/peach-love-happiness-2026-07-11","destination":"/events/aiken-county-sc","permanent":true},
  {"source":"/events/atlanta-ga/atlanta-african-restaurant-week-festival-2026-2026-07-25","destination":"/events/atlanta-ga","permanent":true},
  {"source":"/events/atlanta-ga/day-8-atlanta-cultural-exchange-finale-2026-07-14","destination":"/events/atlanta-ga","permanent":true},
  {"source":"/events/atlanta-ga/food-truck-fridays-vendor-and-sponsor-registration-2026-07-31","destination":"/events/atlanta-ga","permanent":true},
  {"source":"/events/atlanta-ga/traphouse-brunch-rooftop-day-party-2026-07-18","destination":"/events/atlanta-ga","permanent":true},
  {"source":"/events/blythewood-sc/forest-acres-farmers-market-presented-by-lexington-health-2026-07-15","destination":"/events/blythewood-sc","permanent":true},
  {"source":"/events/charleston-sc/charleston-family-fest-2k26-2026-08-29","destination":"/events/charleston-sc","permanent":true},
  {"source":"/events/elgin-sc/community-artisans-farmers-market-2026-07-14","destination":"/events/elgin-sc","permanent":true},
  {"source":"/events/elgin-sc/forest-acres-farmers-market-presented-by-lexington-health-2026-07-15","destination":"/events/elgin-sc","permanent":true},
  {"source":"/events/goose-creek-sc/charleston-coastal-food-festival-2026-08-28","destination":"/events/goose-creek-sc","permanent":true},
  {"source":"/events/goose-creek-sc/charleston-makers-vendors-expo-2026-07-18","destination":"/events/goose-creek-sc","permanent":true},
  {"source":"/events/greer-sc/greer-farmers-market-chili-cookoff-fundraiser-2026-11-15","destination":"/events/greer-sc","permanent":true},
  {"source":"/events/lexington-sc/carolina-food-truck-festival-2026-07-12","destination":"/events/lexington-sc","permanent":true},
  {"source":"/events/marietta-ga/atlanta-african-restaurant-week-festival-2026-2026-07-25","destination":"/events/marietta-ga","permanent":true},
  {"source":"/events/marietta-ga/atlanta-artisans-market-summer-outdoor-craft-fair-2026-07-31","destination":"/events/marietta-ga","permanent":true},
  {"source":"/events/marietta-ga/food-truck-fridays-general-admission-2026-07-17","destination":"/events/marietta-ga","permanent":true},
  {"source":"/events/marietta-ga/traphouse-brunch-rooftop-day-party-2026-07-18","destination":"/events/marietta-ga","permanent":true},
  {"source":"/events/mauldin-sc/pelzer-farmers-market-2026-07-18","destination":"/events/mauldin-sc","permanent":true},
  {"source":"/events/mount-pleasant-sc/charleston-makers-vendors-expo-2026-07-18","destination":"/events/mount-pleasant-sc","permanent":true},
  {"source":"/events/north-charleston-sc/charleston-coastal-food-festival-2026-08-28","destination":"/events/north-charleston-sc","permanent":true},
  {"source":"/events/north-charleston-sc/charleston-family-fest-2k26-2026-08-29","destination":"/events/north-charleston-sc","permanent":true},
  {"source":"/events/north-charleston-sc/charleston-makers-vendors-expo-2026-07-18","destination":"/events/north-charleston-sc","permanent":true},
  {"source":"/events/summerville-sc/charleston-family-fest-2k26-2026-08-29","destination":"/events/summerville-sc","permanent":true},
  {"source":"/events/west-columbia-sc/community-artisans-farmers-market-2026-07-14","destination":"/events/west-columbia-sc","permanent":true},
];

export { legacyEventRedirects };
