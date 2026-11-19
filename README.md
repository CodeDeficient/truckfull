# TruckFull

TruckFull was a food truck discovery site. It listed food trucks, where they were parked, their menus and hours, and local events where trucks were selling.

## Status

**TruckFull is shut down.** On November 19, 2026 every web deployment was taken offline and deleted. The site, the staging site, the daily event pipeline, the search service, the backup jobs and the uptime monitor no longer exist.

This repository is a fresh snapshot of the final source, without the original commit history (see [WORK_HISTORY.md](WORK_HISTORY.md) for what that history held), published **for reference only**. It is not maintained and it is not accepting contributions. It cannot be run as-is: the hosting setup no longer exists, and the database schema history, internal scripts, operational docs and all account-specific keys were left out. Values that pointed at real accounts are now read from environment variables or replaced with placeholders. `.env.local.example` lists the variables the app reads.

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

## License

Copyright (c) 2025-2026 Daniel King. All rights reserved.

This repository is shown for reference only. It is licensed under the [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/) (CC BY-NC-ND 4.0). In short:

- **No commercial use.** You may not use this code or content for commercial purposes.
- **No modified versions.** You may not share changed, adapted or derived versions.
- **Credit required.** Any permitted sharing must credit the author and link to the license.

Any right not expressly granted by that license is reserved. The full terms are in [LICENSE](LICENSE).
