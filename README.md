# Flex Living — Reviews Dashboard
### What this delivers
- **/api/reviews/hostaway** returns **normalized** reviews (from DB; `?raw=1`
returns normalized-from-file)
- **Manager Dashboard** to search/filter basic and approve/unapprove
- **Property page** only shows **approved** reviews
### Data flow
Hostaway (sandbox) → mocked JSON → normalized → seeded into SQLite via Prisma →
served to UI/API.
### Normalization rules
- `id` → `extId` (string)
- categories array → object map `{ [category]: rating }`
- `submittedAt` → ISO string
- preserve `type`, `status`, `rating`, `guestName` → `author`, `publicReview` →
`text`, `listingName`
### Run
```bash
npm run dev
# API: http://localhost:3000/api/reviews/hostaway
# Dashboard: http://localhost:3000/dashboard
# Property: http://localhost:3000/properties/<slug>