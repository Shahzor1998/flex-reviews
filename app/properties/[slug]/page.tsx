import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPropertyMeta } from "@/data/properties";
import { safeJsonRecord } from "@/lib/utils";

type ReviewWithCategories = {
  extId: string;
  rating: number | null;
  submittedAt: Date;
  author: string | null;
  text: string | null;
  categories: Record<string, number | null> | null;
};

function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const total = numbers.reduce((sum, value) => sum + value, 0);
  return Number((total / numbers.length).toFixed(2));
}

function buildCategoryAverages(reviews: ReviewWithCategories[]) {
  const map = new Map<string, { total: number; count: number }>();
  for (const review of reviews) {
    if (!review.categories) continue;
    for (const [key, value] of Object.entries(review.categories)) {
      if (value == null) continue;
      const record = map.get(key) ?? { total: 0, count: 0 };
      record.total += value;
      record.count += 1;
      map.set(key, record);
    }
  }
  return Array.from(map.entries())
    .map(([key, record]) => ({
      key,
      label: key.replaceAll("_", " "),
      average: Number((record.total / record.count).toFixed(1)),
    }))
    .sort((a, b) => b.average - a.average);
}

export default async function PropertyPage({
  params,
}: {
  params: { slug: string };
}) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    include: {
      reviews: {
        where: { approved: true },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!listing) {
    notFound();
  }

  const meta = getPropertyMeta(params.slug);
  const reviews: ReviewWithCategories[] = listing.reviews.map((review) => ({
    extId: review.extId,
    rating: review.rating,
    submittedAt: review.submittedAt,
    author: review.author,
    text: review.text,
    categories: safeJsonRecord(review.categories),
  }));

  const ratingAverage = average(
    reviews.map((review) => review.rating).filter((value): value is number => value != null),
  );

  const categoryAverages = buildCategoryAverages(reviews);

  const heroImages = meta?.heroImages ?? [];

  return (
    <main className="space-y-10">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Link className="hover:text-emerald-700" href="/">
          Home
        </Link>
        <span aria-hidden>{`->`}</span>
        <Link className="hover:text-emerald-700" href="/dashboard">
          Dashboard
        </Link>
        <span aria-hidden>{`->`}</span>
        <span className="text-emerald-700">{listing.name}</span>
      </nav>

      <section className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="overflow-hidden rounded-3xl border border-emerald-100 shadow-md">
            <div
              className="aspect-[4/3] w-full bg-cover bg-center lg:aspect-[5/3]"
              style={{
                backgroundImage: `url(${heroImages[0] ?? "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80"})`,
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {heroImages.slice(1, 5).map((image, index) => (
              <div
                key={image + index}
                className="aspect-[5/4] overflow-hidden rounded-2xl border border-emerald-100 shadow-sm"
                style={{ backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-emerald-600">
              {meta?.location ?? "London"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
              {meta?.headline ?? listing.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              {meta?.summary ??
                "A modern Flex Living residence thoughtfully designed for medium to long stays in London."}
            </p>
          </div>
          {ratingAverage != null && (
            <div className="rounded-3xl border border-emerald-200 bg-white px-6 py-4 text-center shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-600">
                Guest rating
              </p>
              <p className="text-3xl font-semibold text-emerald-800">
                {ratingAverage.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500">{reviews.length} verified review{reviews.length === 1 ? "" : "s"}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          {meta ? (
            <>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  {meta.capacity.guests}
                </span>
                Guests
              </span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  {meta.capacity.bedrooms}
                </span>
                Bedrooms
              </span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  {meta.capacity.bathrooms}
                </span>
                Bathrooms
              </span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  {meta.capacity.beds}
                </span>
                Beds
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-600">
              Capacity details coming soon for this Flex Living home.
            </span>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-8">
          <article className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">About this property</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {meta?.longDescription ??
                "Thoughtfully curated interiors, flexible work-friendly spaces, and the signature Flex Living service make this property ideal for extended stays in the city."}
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Amenities</h2>
              <span className="text-sm text-slate-500">
                {meta?.amenities.length ?? 0} included
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(meta?.amenities ?? []).map((amenity) => (
                <div
                  key={amenity}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-700"
                >
                  {amenity}
                </div>
              ))}
              {(!meta || meta.amenities.length === 0) && (
                <p className="text-sm text-slate-600">
                  Amenities coming soon for this listing.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Stay policies</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(meta?.policies ?? []).map((policy) => (
                <div
                  key={policy.title}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
                >
                  <h3 className="text-sm font-semibold text-emerald-800">{policy.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {policy.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {(meta?.policies ?? []).length === 0 && (
                <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-4 text-sm text-slate-600">
                  Detailed stay policies will be published soon.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Guest reviews</h2>
              <Link
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"
                href="/dashboard"
              >
                Manage approvals
                <span aria-hidden>{`->`}</span>
              </Link>
            </div>
            {reviews.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                Reviews will appear here once they have been approved in the manager dashboard.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {categoryAverages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categoryAverages.map((category) => (
                      <span
                        key={category.key}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {category.label}: {category.average.toFixed(1)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  {reviews.map((review) => (
                    <article
                      key={review.extId}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-6 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {new Date(review.submittedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {review.rating != null && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                            {review.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-slate-700">
                        {review.text ?? "This guest left a private score without a public comment."}
                      </p>
                      {review.author && (
                        <p className="mt-4 text-xs uppercase tracking-wide text-emerald-700">
                          {review.author}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </article>
        </section>

        <aside className="space-y-6">
          <div className="sticky top-28 space-y-6">
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
              <p className="text-xs uppercase tracking-wide text-emerald-600">
                Book your stay
              </p>
              <p className="mt-3 text-3xl font-semibold text-emerald-800">
                GBP {meta?.nightlyRate ?? 0}
                <span className="text-base font-normal text-slate-500"> / night</span>
              </p>
              <div className="mt-5 grid gap-3">
                <label className="text-xs font-semibold text-slate-600">
                  Check-in
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Check-out
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Guests
                  <input
                    type="number"
                    min={1}
                    defaultValue={meta?.capacity.guests ?? 1}
                    className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
              </div>
              <dl className="mt-5 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>Cleaning fee</dt>
                  <dd>GBP {meta?.cleaningFee ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Service fee</dt>
                  <dd>Included</dd>
                </div>
              </dl>
              <button className="mt-6 w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Request to book
              </button>
              <p className="mt-3 text-xs text-slate-500">
                Instant booking available for verified Flex Living partners.
              </p>
            </div>

            {meta && (
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-emerald-800">Highlights</h3>
                <ul className="mt-3 space-y-3 text-sm text-slate-600">
                  {meta.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}


