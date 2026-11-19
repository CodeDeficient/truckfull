# TruckFull

TruckFull was a food truck discovery site. It listed food trucks, where they were parked, their menus and hours, and local events where trucks were selling.

## Status

**TruckFull is shut down.** On November 19, 2026 every web deployment was taken offline and deleted. The site, the staging site, the daily event pipeline, the search service, the backup jobs and the uptime monitor no longer exist.

This repository is a fresh snapshot of the final source, without the original commit history (the [work history](#work-history) below records what that history held), published **for reference only**. It is not maintained and it is not accepting contributions. It cannot be run as-is: the hosting setup no longer exists, and the database schema history, internal scripts, operational docs and all account-specific keys were left out. Values that pointed at real accounts are now read from environment variables or replaced with placeholders. `.env.local.example` lists the variables the app reads.

## What it did

- **Truck listings.** Profiles with menus, hours, contact details, photos and service areas, grouped by city and cuisine.
- **Live updates from Facebook.** Owners who connected a Facebook page had new posts read by AI models, which pulled out locations, times and menu changes and updated the truck's schedule.
- **Events.** A daily pipeline collected public events from city calendars and event feeds, removed duplicates, and kept only events where food trucks were likely to sell.
- **Owner dashboard.** Truck owners could claim a listing, edit it, post schedule changes and manage a paid plan through Stripe.
- **Admin tools.** Data quality checks, import review, webhook monitoring and listing management.

## How it was built

| Area | Technology |
| --- | --- |
| Web app | Next.js 16, React 19, TypeScript 5.9, Tailwind CSS |
| Database, auth, file storage | Supabase (PostgreSQL with PostGIS) |
| Hosting | Next.js in Cloudflare Containers behind Cloudflare Workers |
| Caching and rate limits | Upstash Redis, Cloudflare R2 |
| AI | OpenRouter and Ollama Cloud models for reading posts and classifying events |
| Search | Self-hosted SearXNG plus paid search APIs, each behind a circuit breaker |
| Maps | Mapbox |
| Payments | Stripe |
| Tests | Jest for unit tests, Playwright for browser and API tests |

Phones got their own layout through a Next.js parallel route (`app/@mobile`), chosen per request.

## Repository layout

| Path | What it holds |
| --- | --- |
| `app/` | Pages, layouts and API routes |
| `components/`, `hooks/` | Shared UI |
| `lib/` | Business logic: services, webhooks, event feeds, the pipeline, research and search |
| `worker/` | The Cloudflare Worker code that sat in front of each container |
| `containers/` | Docker images for the pipeline, search and backup services |
| `wrangler.*.jsonc` | Cloudflare deployment settings, kept as a record with placeholder IDs. None of these Workers exist any more. |
| `docs/` | Architecture overview, the geocoding cascade and testing patterns |
| `__tests__/`, `tests/` | Jest and Playwright tests. At shutdown, 36 of the 665 Jest suites were failing and were left as they were. Several of those are Playwright API files that Jest also picks up, and the Playwright suites expect the old staging setup. |

## Work history

The original repository's history could not be published because it held private data, so this section records the work it contained. All figures come from the original repository and its GitHub records, exported on 2026-11-19.

### At a glance

| Measure | Count |
| --- | --- |
| Time span | 31 May 2025 to 19 November 2026 (about 18 months) |
| Days with at least one commit | 280 |
| Commits on the main branch | 5,600 (4,684 excluding merges) |
| Commits across all branches | 12,749 |
| Lines added / deleted (main, excluding merges) | 3,917,606 / 1,641,228 |
| Pull requests opened | 1,097 (921 merged, 176 closed) |
| Branches behind those pull requests | 878 |
| Issues filed | 1,050 |
| CI workflow runs | 6,103 |
| Database migrations written | 484 |
| Files in the final tree | 4,148 |
| Jest suites / tests at shutdown | 665 / 8,223 |

Nearly all of this work was done by one developer, Daniel King, who opened
1,053 of the 1,097 pull requests and 1,032 of the 1,050 issues. The rest came
from dependency and review bots.

### Commits by type

Based on conventional commit prefixes on the main branch, excluding merges.

| Type | Commits |
| --- | --- |
| fix | 2,188 |
| feat | 731 |
| test | 499 |
| chore | 257 |
| docs | 228 |
| refactor | 178 |
| perf | 126 |
| style | 53 |
| security | 29 |
| other or unprefixed | 395 |

### Activity by month

| Month | Commits (excluding merges) | PRs merged | Issues filed |
| --- | ---: | ---: | ---: |
| 2025-06 | 135 | 4 | 0 |
| 2025-07 | 166 | 23 | 0 |
| 2025-08 | 92 | 2 | 0 |
| 2025-09 | 42 | 1 | 0 |
| 2025-10 | 139 | 1 | 0 |
| 2025-11 | 140 | 7 | 0 |
| 2025-12 | 149 | 21 | 0 |
| 2026-01 | 306 | 24 | 21 |
| 2026-02 | 199 | 3 | 36 |
| 2026-03 | 282 | 34 | 47 |
| 2026-04 | 713 | 102 | 69 |
| 2026-05 | 438 | 68 | 127 |
| 2026-06 | 272 | 27 | 24 |
| 2026-07 | 399 | 93 | 87 |
| 2026-08 | 433 | 64 | 98 |
| 2026-09 | 272 | 89 | 254 |
| 2026-10 | 384 | 265 | 268 |
| 2026-11 | 123 | 93 | 19 |

### What was built, in order

**Summer 2025.** First proof of concept: a map of food trucks backed by
Supabase, a scraper that ran in GitHub Actions, and the first code quality
and TypeScript cleanup passes.

**Autumn 2025.** Mobile and desktop split into separate route groups,
dependency upgrades, and analytics.

**December 2025.** Legal pages, OAuth sign-in, PostHog observability, a PWA
with installable icons, and a first-paint fix that took load time from about
13 seconds to under 2.

**January to March 2026.** Premium owner features: owner dashboard, profile
and settings, billing, Facebook page connection and deauthorization, and app
verification with Google and Meta. Public API responses were stripped of
internal fields.

**April 2026.** Event ingestion grew to 14 cities across South Carolina and
Georgia with four new feed adapters. A deep research pipeline, foot traffic
data, an events map, and an investigation workflow for verifying listings
were added.

**May 2026.** Programmatic SEO: city, cuisine and "best of" pages, a blog,
sitemaps, Open Graph images, structured data and IndexNow. Secret scanning
and stricter git hooks. Bundle size and page speed work.

**June 2026.** Service worker baseline, richer truck metadata, top truck
sections on city pages, event landing pages, a search provider chain with
circuit breakers, and a relevance classifier for events.

**July 2026.** Facebook webhook delivery end to end: page subscriptions, post
sync, post history and image display. Eventbrite sources for 57 more cities
across Georgia and both Carolinas. Event deduplication with graph clustering.

**August 2026.** Performance and cost work: cheaper proxy paths for
anonymous visitors, incremental static regeneration for events, precise
cache invalidation, lower database egress, and image upload sanitizing.

**September 2026.** Date-aware schedules: dated location overrides,
geocoding on write, map markers that move to the day's location, and a new
schedule popup on desktop and mobile. Owner funnel tracking. Production
moved from Vercel to Cloudflare Containers.

**October 2026.** The busiest month: 265 pull requests. A rebuilt public
truck page, faster map and nearby search, database functions for public
reads with locked-down permissions, data provenance tracking, and legal terms
for data use.

**November 2026.** Hot path performance sweeps, a generated content hash
column for events, reliability fixes, and the shutdown on 19 November.

## License

Copyright (c) 2025-2026 Daniel King. All rights reserved.

This repository is shown for reference only. It is licensed under the [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/) (CC BY-NC-ND 4.0). In short:

- **No commercial use.** You may not use this code or content for commercial purposes.
- **No modified versions.** You may not share changed, adapted or derived versions.
- **Credit required.** Any permitted sharing must credit the author and link to the license.

Any right not expressly granted by that license is reserved. The full terms are in [LICENSE](LICENSE).
