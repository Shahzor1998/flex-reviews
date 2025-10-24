# Flex Living Reviews Dashboard

End-to-end take-home project that ingests Hostaway reviews, normalises them for Flex Living, and powers a manager dashboard plus a public-facing property page. The repository contains everything required to seed a local database, explore the API output, and review the UI flows the brief requested.

## 1. Getting started

### Prerequisites
- Node.js 18+
- npm 10+

### Installation
```bash
npm install
```

### Environment
Copy `.env` if it is not already present and confirm the SQLite URL plus Hostaway credentials:
```
DATABASE_URL="file:./dev.db"
HOSTAWAY_ACCOUNT_ID="your-account-id"
HOSTAWAY_API_KEY="your-api-key"
HOSTAWAY_BASE_URL="https://api.hostaway.com/v1"
GOOGLE_MAPS_API_KEY=""
```

### Database
```bash
npx prisma migrate deploy
npx prisma db seed
```
The seeder reads `data/hostaway_mock_reviews.json`, slugifies the listings, upserts records, and keeps previously approved flags intact.

### Run locally
```bash
npm run dev
# Dashboard: http://localhost:3000/dashboard
# Property page: http://localhost:3000/properties/2b-n1-a-29-shoreditch-heights
# API: http://localhost:3000/api/reviews/hostaway
```

## 2. Data workflow
1. **Fetch or mock Hostaway reviews.** `lib/hostaway.ts` can call the real API (`source=api`) or load the provided JSON (`source=mock`). API credentials are read from the environment and failures fall back to the mock dataset.
2. **Normalise the payload.** `normalizeHostaway` uses `zod` to coerce IDs, optional fields, review categories, ISO dates, and listing slugs.
3. **Persist to SQLite via Prisma.** `POST /api/reviews/hostaway` upserts listings and reviews, keeping the `approved` flag untouched on updates.
4. **Serve to frontend clients.** `GET /api/reviews/hostaway` returns review rows plus per-listing rollups (counts, averages, latest review).

### Normalisation rules
- `id` -> string `extId`
- Flatten categories array into `{ [category]: rating | null }`
- Convert timestamps to ISO strings
- Preserve review metadata (`type`, `status`, `guestName`, `publicReview`)
- Derive a kebab-case `listingSlug` for routing

## 3. API reference

### GET `/api/reviews/hostaway`
Query parameters:
- `listingSlug` Filter by property slug
- `approved` `true` or `false`
- `from` / `to` ISO date strings
- `sort` `submittedAt:asc|desc` or `rating:asc|desc`
- `source=mock` or `source=api` to bypass the database

Returns `{ provider, source, count, reviews[], summary[] }` where each review includes the approval state, categories, slug, and listing metadata. `summary` aggregates totals and averages per listing for the dashboard header cards.

### POST `/api/reviews/hostaway`
Body: `{ "source": "mock" | "api" }` (default mock). Re-imports data and returns an updated summary. Useful for refreshing without running the Prisma seed manually.

### POST `/api/reviews/approve`
Body: `{ "extId": string, "approved": boolean }`. Updates a single review, revalidates the dashboard and property route cache, and returns `{ ok, extId, approved, listingSlug }`.

## 4. Frontend features

### Manager dashboard (`/dashboard`)
- Summary cards per property displaying total reviews, approval counts, latest review date, and quick links to the property view.
- Comprehensive filters: search, property selector, approval status, date range, category, min/max rating sliders, and sort order.
- Inline approve/unapprove actions with optimistic UI; state revalidates via SWR after server confirmation.
- Review cards styled to match the Flex Living brand (light cream background, emerald accents) with category badges and property shortcuts.

### Property experience (`/properties/[slug]`)
- Layout mirrors the live Flex Living listing style: hero image grid, highlights cards, booking widget, amenities grid, and stay policies.
- Approved reviews only, grouped with badges that summarise average category scores.
- Static metadata provided in `data/properties.ts` for each seeded slug (location, images, capacities, highlights).

### Landing page (`/`)
- Hero section describing the workflow and quick navigation links.
- Featured cards for each seeded property showing the slug, average approved rating, and API shortcut links.

## 5. Google Reviews exploration
- Google Places API is the recommended entry point for pulling public Google Reviews. It requires a Places API key, billing enabled on a GCP project, and the property's **place_id**.
- Rate limits: Places Details is capped at 1000 calls/day by default and returns a maximum of 5 most relevant reviews per request. Additional reviews require pagination with `next_page_token`.
- FieldMask: `fields=review` exposes the review array, but per the latest docs numerical star ratings are only available in `reviews.rating` (1-5).
- To integrate safely we would persist the `place_id` on each `Listing`, ingest Google reviews separately, and mark the provider as `google`. UI changes would surface the provider source alongside Hostaway.
- Because Places API calls are billable and require production credentials, the project documents the approach but leaves implementation disabled pending client approval. See `GOOGLE_MAPS_API_KEY` in `.env`.

## 6. Technical decisions
- **Next.js App Router** for server components, API routes, and easy integration with Prisma on the server.
- **Prisma + SQLite** keeps local setup frictionless while still enabling relation filters, upserts, and transactions.
- **Zod** provides strict runtime validation for third-party payloads.
- **SWR** on the dashboard handles data fetching, revalidation, and basic caching for the review list.
- **Design system**: Tailwind utility classes with a light, Flex-inspired palette (`#F8F5EF` background, emerald accents) to approximate the brand shown in the brief.

## 7. Useful scripts
- `npm run dev` - start Next.js in development mode
- `npm run build && npm start` - production build/start
- `npm run lint` - run ESLint (may take ~30s on first run while ESLint spins up)
- `npx prisma studio` - inspect the SQLite data

---

Deliverables implemented:
- Mock and optional live Hostaway ingestion with normalised output
- Manager dashboard that surfaces trends and allows approval workflows
- Property page showing only approved reviews in a Flex Living style
- Documentation of Google Reviews feasibility and next steps

## Documentation

For the technical brief covering architecture, API behaviors, and Google Reviews findings, see `docs/BriefDocumentation.md` 
