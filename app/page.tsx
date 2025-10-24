import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAllPropertyMeta } from "@/data/properties";

type ListingCard = {
  slug: string;
  name: string;
  location: string;
  headline: string;
  heroImage: string | null;
  approvedCount: number;
  averageRating: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

export default async function Home() {
  const listings = await prisma.listing.findMany({
    include: {
      reviews: {
        select: { rating: true, approved: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const metaBySlug = new Map(
    getAllPropertyMeta().map((meta) => [meta.slug, meta]),
  );

  const cards: ListingCard[] = listings.map((listing) => {
    const meta = metaBySlug.get(listing.slug);
    const approvedRatings = listing.reviews
      .filter((review) => review.approved && review.rating != null)
      .map((review) => review.rating as number);

    return {
      slug: listing.slug,
      name: listing.name,
      location: meta?.location ?? "London",
      headline: meta?.headline ?? listing.name,
      heroImage: meta?.heroImages[0] ?? null,
      approvedCount: listing.reviews.filter((review) => review.approved).length,
      averageRating: average(approvedRatings),
    };
  });

  return (
    <main className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 px-8 py-12 text-white shadow-lg md:px-16 lg:px-20">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">
          Flex Living
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold md:text-5xl">
          Reviews intelligence for hospitality teams that move fast.
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-emerald-100 md:text-base">
          Surface actionable insights across listings, approve guest testimonials
          for the marketing site, and keep an eye on trends across review
          channels. Everything you need to protect your brand experience lives in
          this dashboard.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-emerald-800 shadow-md transition hover:bg-emerald-50"
          >
            Open manager dashboard
            <span aria-hidden>{`->`}</span>
          </Link>
          <Link
            href="#featured-properties"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-5 py-3 text-white transition hover:bg-emerald-600/70"
          >
            Explore properties
          </Link>
        </div>
      </section>

      <section
        id="featured-properties"
        className="space-y-6 rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Featured Flex Living homes
            </h2>
            <p className="text-sm text-slate-600">
              Pull a slug from below to preview the public-facing reviews page.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"
          >
            Manage approvals
            <span aria-hidden>{`->`}</span>
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.slug}
              className="flex flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/40 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              {card.heroImage ? (
                <div
                  className="h-48 bg-cover bg-center"
                  style={{ backgroundImage: `url(${card.heroImage})` }}
                />
              ) : (
                <div className="h-48 bg-gradient-to-br from-emerald-300 to-emerald-500" />
              )}
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-emerald-600">
                    {card.location}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.headline}
                  </h3>
                  <p className="text-xs text-slate-500">Slug: {card.slug}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-emerald-600">
                      Approved reviews
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {card.approvedCount}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-emerald-600">
                      Avg rating
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {card.averageRating != null
                        ? card.averageRating.toFixed(1)
                        : "n/a"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-sm">
                  <Link
                    href={`/properties/${card.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
                  >
                    View property page
                    <span aria-hidden>{`->`}</span>
                  </Link>
                  <Link
                    href={`/api/reviews/hostaway?listingSlug=${card.slug}`}
                    className="text-emerald-700 hover:text-emerald-800"
                  >
                    API sample
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {cards.length === 0 && (
            <article className="rounded-3xl border border-dashed border-emerald-200 bg-white p-6 text-sm text-slate-600">
              Seed the database with `npm run prisma db seed` to populate Flex Living
              listings.
            </article>
          )}
        </div>
      </section>
    </main>
  );
}



