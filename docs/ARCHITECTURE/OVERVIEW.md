---
title: Architecture Overview
status: canonical
owner: Daniel King
last_reviewed: 2026-04-03
supersedes: []
superseded_by: null
---

# Architecture Overview

## System Components

```mermaid
flowchart TD
    subgraph "Client"
        A["Next.js 16 App\n(React 19, TypeScript 5.9)"]
        A1["Mobile Layout (@mobile/)"]
        A2["Desktop Layout"]
        A3["Owner Dashboard"]
        A4["Admin Dashboard"]
    end

    subgraph "API Layer"
        B["Next.js API Routes"]
        B1["Tier Middleware"]
        B2["Rate Limiting"]
        B3["Auth Verification"]
    end

    subgraph "Services"
        C["FoodTruckService"]
        C1["ReviewsService"]
        C2["ClaimService"]
        C3["NotificationService"]
        C4["EventIngestionService"]
        C5["StripeService"]
    end

    subgraph "Supabase"
        D["PostgreSQL + PostGIS"]
        D1["Auth (RLS)"]
        D2["Storage"]
    end

    subgraph "External"
        E1["Stripe"]
        E2["Firebase FCM"]
        E3["Facebook Graph API"]
        E4["Event Sources\n(Eventbrite, Timely, RSS, etc.)"]
        E5["AI Services\n(Scira, Exa, OpenRouter, GLM OCR)"]
        E6["Traffic APIs\n(Foursquare, TomTom, GA DOT)"]
        E7["Tavily API\n(search fallback)"]
    end

    subgraph "Cloudflare"
        F1["SearXNG Container\n(authenticated Worker)"]
        F3["Event Pipeline\n(daily Worker + container)"]
    end

    A --> A1
    A --> A2
    A --> A3
    A --> A4

    A1 --> B
    A2 --> B
    A3 --> B
    A4 --> B

    B --> B1
    B --> B2
    B --> B3

    B --> C
    B --> C1
    B --> C2
    B --> C3
    B --> C4
    B --> C5

    C --> D
    C1 --> D
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D

    D --> D1
    D --> D2

    C3 --> E2
    C5 --> E1
    C4 --> E4
    C --> E3
    C --> E5
    C --> E6
    C3 --> E7

    B --> F1
    C4 --> F3
```

## Key Architectural Decisions

- **Next.js App Router** with parallel routes for mobile/desktop layouts
- **Supabase** for auth/storage/database with RLS enforced on all user-scoped tables
- **PostGIS** for geospatial queries (location-based truck discovery, radius filtering)
- **Feature-first organization** — services in `lib/services/`, API handlers in `lib/api/`
- **Tier-based access control** — middleware enforces free/starter/pro feature gates
- **Firebase FCM** for push notifications with tier-based routing
- **Stripe** for subscription management with webhook-driven lifecycle
- **Multi-source event ingestion** — 27 cities across SC/GA with 9 source adapters and vetting pipeline
- **AI pipeline** — Scira (research), Tavily (search API), SearXNG (self-hosted search), OpenRouter (parsing), GLM (OCR)
- **Self-hosted search** — SearXNG on Cloudflare Containers behind an authenticated Worker. Tavily API as parallel blended fallback (29% overlap, 13.6 avg results vs 9.8 solo)
- **Eventbrite rate limiting** — Pre-fetch dedup, 200 call/city cap, cross-city dedup by (name+date+rounded coords), configurable budget via env vars
- **Scheduled pipeline** — Daily event ingestion runs as a Cloudflare Worker + container

## Data Flow

```
User Request → Auth → Tier Check → API Route → Service → Supabase → Response
                                                              ↓
                                                    External APIs (Stripe, FCM, Facebook, AI)
```

## Deployment

- **CI/CD**: GitHub Actions (type-check, lint, test on PR)
- **Hosting**: Cloudflare Workers + Containers (production); Vercel retained only as a frozen rollback
- **Database**: Supabase (production)
- **Scheduled jobs**: Event ingestion runs daily on a Cloudflare Worker + container (`truckfull-pipeline-production`)
- **Search**: SearXNG on Cloudflare Containers, authenticated by the `truckfull-searxng-production` Worker
- **Code Quality**: Semgrep, CodeQL, ZAP, Striker, fast-check (Docker-based)

See ADRs for decision history.
