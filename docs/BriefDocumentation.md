# Flex Living Reviews Dashboard - Technical Brief

This brief summarizes the solution delivered for the Flex Living reviews dashboard. It covers technology choices, key design decisions, API behaviors, and Google Reviews exploration. Intended audience: engineering reviewers and product stakeholders.

## Overview
A lightweight, API-first Reviews Dashboard that ingests mocked Hostaway reviews, normalizes them, stores them in a local database, and exposes them to a manager dashboard where reviews can be approved for public display. Public property pages render only manager-approved reviews and are styled to align with the Flex Living property layout.

---

## Tech Stack Used
- **Next.js App Router (16) + TypeScript**
  Single repo for backend routes and frontend UI (React Server Components plus client components where needed).
- **Prisma ORM + SQLite**
  Zero-config local database, type-safe queries, migrations, and seed script.
- **Zod**
  Safe parsing and normalization of real-world JSON payloads.
- **SWR**
  React data fetching with cache and revalidation for the dashboard experience.
- **Tailwind CSS**
  Rapid styling with Flex-inspired palette; sticky header shell.
- **date-fns**
  Lightweight date helpers for formatting review timestamps.


Environment variables in `.env`:

```
DATABASE_URL="file:./dev.db"
HOSTAWAY_ACCOUNT_ID="your-account-id"
HOSTAWAY_API_KEY="your-api-key"
HOSTAWAY_BASE_URL="https://api.hostaway.com/v1"
GOOGLE_MAPS_API_KEY=""
```

## Key Design and Logic Decisions
- Normalization boundary: Hostaway responses are parsed and normalized once into a consistent shape (string `extId`, ISO dates, flattened category map, derived `listingSlug`). This shields the UI from provider-specific quirks and allows future providers (for example Google) to plug in with the same interface.
- Source of truth: Reviews are persisted in SQLite. The API supports three sources when reading: database (default), mock JSON (`source=mock`), or the live Hostaway sandbox (`source=api`). When importing (POST), listings and reviews are upserted to keep approvals stable.
- Approvals workflow: Manager dashboard toggles a boolean `approved` per review. Approved reviews are the only ones rendered on property pages. API revalidates dashboard and property paths after a change to keep pages in sync.
- Summaries for insight: The API aggregates per-listing counts, pending/approved numbers, average rating, and latest review date. Dashboard cards use these to help managers spot trends at a glance.
- Search and filters: Client-side filters (search, listing, approval, date range, category, rating range, sort) narrow the currently loaded set without extra round trips. Server API accepts equivalent query params for deep-linking or future SSR use.
- UX alignment: Property pages approximate the Flex style: image mosaic, cream background, capacity chips, amenity and policy cards, sticky booking widget, and approved review badges.

## Architecture and Data Flow
Mocked Hostaway JSON -> normalize -> persist in SQLite (via Prisma) -> serve via API -> dashboard UI for approval -> property page shows only approved reviews.

- Normalizer lives in `lib/normalize.ts`.
- Prisma client lives in `lib/db.ts`.
- Seed script imports the mock JSON and creates Listings and Reviews.

### Data Model (summary)
- `Listing`: `id`, `slug`, `name`, `channel`, timestamps.
- `Review`: `id`, `extId`, `provider`, `type`, `status`, `rating?`, `categories JSON?`, `submittedAt`, `author?`, `text?`, `approved` (default false), `listingId`, timestamps.

## Normalization Rules
| Raw (Hostaway) | Normalized Field | Notes |
|----------------|------------------|-------|
| `id`           | `extId`          | Stringified external ID |
| `guestName`    | `author`         | Nullable string |
| `publicReview` | `text`           | Nullable string |
| `reviewCategory[]` | `categories` | Converted to `{ [category]: rating }` |
| `submittedAt`  | `submittedAt`    | Coerced to ISO string |
| `type`, `status` | `type`, `status` | Passed through |
| `rating`       | `rating`         | Nullable number |
| `listingName`  | `listingName`    | Passed through for UI display |
| provider implicit | `provider`    | Set to `"hostaway"` |

## API Behaviors
Base: `/api/reviews/hostaway`

- **GET** (database, default)
  - Query params: `listingSlug`, `approved` (`true|false`), `from`, `to` (ISO), `sort` (`submittedAt:asc|desc` or `rating:asc|desc`).
  - Response shape: `{ provider, source: "database", count, filters, reviews[], summary[] }`.
- **GET** (mock or API passthrough)
  - `?source=mock` (or `?raw=1` legacy) normalizes the mock JSON directly.
  - `?source=api` attempts Hostaway sandbox; on failure falls back to mock with a 502 and carries an error message.
- **POST** `/api/reviews/hostaway`
  - Body `{ "source": "api" | "mock" }` (default `mock`).
  - Normalizes then upserts Listings and Reviews in a transaction. Returns updated summary. Approvals remain intact.
- **POST** `/api/reviews/approve`
  - Body `{ extId: string, approved: boolean }`.
  - Updates only the approval flag, includes listing context, and revalidates `/dashboard` and `/properties/[slug]`.

### Normalized Review (shape)
```
{
  extId: string,
  provider: "hostaway",
  channel: string,
  type: string,
  status: string,
  rating: number | null,
  categories: Record<string, number | null> | null,
  submittedAt: ISOString,
  author: string | null,
  text: string | null,
  listingName: string,
  listingSlug: string,
  approved?: boolean
}
```

### Example response (database GET)
```
{
  "provider": "hostaway",
  "source": "database",
  "count": 3,
  "reviews": [
    {
      "extId": "9012",
      "provider": "hostaway",
      "type": "guest-to-host",
      "status": "published",
      "rating": 8.5,
      "categories": { "cleanliness": 8, "communication": 8, "check_in": 7 },
      "submittedAt": "2021-10-10T19:30:00.000Z",
      "author": "Jon K.",
      "text": "Spacious flat, check-in took a bit longer.",
      "listingName": "Old Street Loft — 12B",
      "approved": false
    }
  ],
  "summary": [
    {
      "listingSlug": "old-street-loft-12b",
      "reviewCount": 2,
      "approvedCount": 1,
      "pendingCount": 1,
      "averageRating": 8.85,
      "latestReviewAt": "2021-10-10T19:30:00.000Z"
    }
  ]
}
```

### Approval toggle endpoint
```
POST /api/reviews/approve
{ "extId": "9012", "approved": true }
→ { "ok": true, "extId": "9012", "approved": true }
```

Notes:
- Only the `approved` flag changes. Other review fields remain immutable.
- The property page queries only `approved: true` reviews.

## Manager Dashboard (Admin)
- Search by listing name, review text, or author (case-insensitive).
- Toggle approval to control public visibility.
- Baseline filter: show only unapproved reviews for quick triage.
- Extensible for additional filters (rating threshold, category badge click, channel, date range).
- SWR keeps the list fresh and responsive with optimistic updates after toggles.

## Property Review Display (Public)
- Renders under a centered container with soft cards and rating badges to mirror the Flex Living property detail page.
- Shows only manager-approved reviews, sorted newest first.
- Visual cues are aligned with the public site style: cream background, rounded cards, clean typography, subtle metadata (author, date).
- Hero photo grid presents a mosaic on large screens and a swipeable carousel on mobile, with clear “View all photos” calls to action.

## Google Reviews Findings
- Feasible path: Google Places Details API (Place ID) can return up to five most relevant public reviews per call (`reviews[]` with `rating`, `time`, `text`, `author_name`). Requires GCP billing and API key.
- Rate limits: default free quotas are modest; caching and scheduled ingestion recommended. Reviews are curated for quality, not exhaustive; pagination is limited.
- Data considerations: content policies prohibit storing certain PII; treat Google as an additional provider with its own `provider: "google"`, separate import, and clear attribution on UI.
- Next steps (post-MVP): add `placeId` to `Listing`, build `GET /api/reviews/google` plus importer mirroring Hostaway normalization, and surface provider badges in the UI. Keep the same approval gate so property pages only show manager-approved items.
- MVP decision: keep the system provider-agnostic, document constraints, and defer a full Google Reviews integration until billing, quotas, and compliance can be managed.

## Local Setup and Ops
- Install and run: `npm install`, `npx prisma migrate deploy`, `npx prisma db seed`, `npm run dev`.
- Key routes: `/dashboard` for approvals; `/properties/[slug]` for the public page; `/api/reviews/hostaway` for normalized data.
- Secrets: `.env` is ignored by Git; README uses placeholders only.

### Setup and Run (expanded)
```
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Test URLs:
- Dashboard: http://localhost:3000/dashboard
- Property page: http://localhost:3000/properties/<your-listing-slug>
- API: http://localhost:3000/api/reviews/hostaway
- API (raw normalization): http://localhost:3000/api/reviews/hostaway?source=mock

---
Prepared by: Shahzor Khan
Version: 1.0

