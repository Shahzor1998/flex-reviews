# Flex Living Reviews Dashboard — Technical Brief

This brief summarizes the solution delivered for the Flex Living reviews dashboard. It covers technology choices, key design decisions, API behaviors, and Google Reviews exploration. Intended audience: engineering reviewers and product stakeholders.

## Tech Stack
- Framework: Next.js App Router (16) with React Server Components.
- Styling: Tailwind CSS utilities with a Flex-inspired palette; light layout shell + sticky header.
- Data layer: Prisma ORM + SQLite for local development (file-based DB). Seeded with mocked Hostaway data.
- Runtime validation: Zod to parse and normalize third-party JSON.
- Data fetching: SWR on the dashboard for client-side state, caching, and optimistic updates.
- Tooling: TypeScript, ESLint. Optional PDF generation for this doc via `md-to-pdf`.

## Key Design & Logic Decisions
- Normalization boundary: Hostaway responses are parsed and normalized once into a consistent shape (string `extId`, ISO dates, flattened category map, derived `listingSlug`). This shields the UI from provider-specific quirks and allows future providers (e.g., Google) to plug in with the same interface.
- Source-of-truth: Reviews are persisted in SQLite. The API supports three sources when reading: database (default), mock JSON (`source=mock`), or the live Hostaway sandbox (`source=api`). When importing (POST), listings and reviews are upserted to keep approvals stable.
- Approvals workflow: Manager dashboard toggles a boolean `approved` per review. Approved reviews are the only ones rendered on property pages. API revalidates dashboard and property paths after a change to keep pages in sync.
- Summaries for insight: The API aggregates per-listing counts, pending/approved numbers, average rating, and latest review date. Dashboard cards use these to help managers spot trends at a glance.
- Search + filters: Client-side filters (search, listing, approval, date range, category, rating range, sort) narrow the currently loaded set without extra round trips. Server API accepts equivalent query params for deep-linking or future SSR use.
- UX alignment: Property pages approximate The Flex style: image mosaic, cream background, capacity chips, amenity and policy cards, sticky booking widget, and approved review badges.

## API Behaviors
Base: `/api/reviews/hostaway`

- GET (database, default)
  - Query: `listingSlug`, `approved` (`true|false`), `from`, `to` (ISO), `sort` (`submittedAt:asc|desc` or `rating:asc|desc`)
  - Response: `{ provider, source: "database", count, filters, reviews[], summary[] }`

- GET (mock or API passthrough)
  - `?source=mock` (or `?raw=1` legacy): returns normalized reviews from the provided JSON.
  - `?source=api`: attempts Hostaway sandbox; on failure, falls back to mock with a 502 and carries an error message.

- POST (import/refresh)
  - Body `{ "source": "api" | "mock" }` (default: `mock`).
  - Normalizes then upserts Listings and Reviews in a transaction. Returns updated summary. Approvals remain intact.

- POST `/api/reviews/approve`
  - Body `{ extId: string, approved: boolean }`.
  - Updates the review, includes listing context, and revalidates `/dashboard` and `/properties/[slug]`.

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
  approved?: boolean // only on API rows from DB
}
```

## Google Reviews Findings
- Feasible path: Google Places Details API (Place ID) can return up to 5 most relevant public reviews per call (`reviews[]` with `rating`, `time`, `text`, `author_name`). Requires GCP billing and API key.
- Rate limits: Default free quotas are modest; caching and scheduled ingestion recommended. Reviews are curated for quality, not exhaustive; pagination is limited.
- Data considerations: Content policies prohibit storing certain PII; treat Google as an additional provider with its own `provider: "google"`, separate import, and clear attribution on UI.
- Next steps (post-MVP): Add `placeId` to `Listing`, a `GET /api/reviews/google` + importer mirroring Hostaway normalization, and provider badges in the UI. Keep the same approval gate so property pages only show manager-approved items.

## Local Setup & Ops (summary)
- Install and run: `npm install`, `npx prisma migrate deploy`, `npx prisma db seed`, `npm run dev`.
- Key routes: `/dashboard` for approvals; `/properties/[slug]` for the public page; `/api/reviews/hostaway` for normalized data.
- Secrets: `.env` is ignored by Git; README uses placeholders only.

---
Prepared by: Flex Reviews implementation
Version: 1.0
