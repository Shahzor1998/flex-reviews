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

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
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
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (!slug) {
    notFound();
  }

  const listing = await prisma.listing.findUnique({
    where: { slug },
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

  const meta = getPropertyMeta(slug);
  const reviews: ReviewWithCategories[] = listing.reviews.map((review) => ({
    extId: review.extId,
    rating: review.rating,
    submittedAt: review.submittedAt,
    author: review.author,
    text: review.text,
    categories: safeJsonRecord(review.categories),
  }));

  const ratingAverage = average(
    reviews
      .map((review) => review.rating)
      .filter((value): value is number => value != null),
  );

  const categoryAverages = buildCategoryAverages(reviews);

  const heroImages =
    meta?.heroImages && meta.heroImages.length > 0
      ? meta.heroImages
      : [
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
        ];
  const primaryImage = heroImages[0];
  const secondaryImages = heroImages.slice(1, 5);

  const capacityItems = [
    {
      label: "Guests",
      value: meta?.capacity.guests ?? listing.reviews.length + 2,
    },
    {
      label: "Bedrooms",
      value: meta?.capacity.bedrooms ?? 2,
    },
    {
      label: "Bathrooms",
      value: meta?.capacity.bathrooms ?? 1,
    },
    {
      label: "Beds",
      value: meta?.capacity.beds ?? 3,
    },
  ];

  const amenities = meta?.amenities ?? [];
  const highlights = meta?.highlights ?? [];
  const policies = meta?.policies ?? [];

  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(meta?.location ?? "London, United Kingdom")}&z=12&output=embed`;

  return (
    <main className="space-y-12 bg-[#FFF9E9] py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 md:px-0">
        <nav className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-emerald-700">
          <Link className="hover:underline" href="/">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-slate-500">{listing.name}</span>
        </nav>

        <section className="grid gap-4 lg:grid-cols-[3fr,2fr]">
          <div className="relative overflow-hidden rounded-3xl border border-[#E9E3D7] bg-white shadow-sm">
            <div
              className="aspect-[5/3] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${primaryImage})` }}
            />
            <button className="absolute bottom-4 right-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-700 shadow-lg transition hover:bg-emerald-50">
              View all photos
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {secondaryImages.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#E9E3D7] bg-white shadow-sm"
                style={{
                  backgroundImage: `url(${image})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />
            ))}
            {secondaryImages.length < 4 &&
              Array.from({ length: Math.max(0, 4 - secondaryImages.length) }).map(
                (_unused, index) => (
                  <div
                    key={`placeholder-${index}`}
                    className="aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-[#E9E3D7] bg-white/70 shadow-inner"
                  />
                ),
              )}
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">
              {meta?.location ?? "London"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1f2933]">
              {listing.name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-4 rounded-3xl border border-[#E9E3D7] bg-white p-6 shadow-sm">
            {capacityItems.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
                  {value}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-[2fr,1fr]">
          <section className="space-y-8">
            <article className="rounded-3xl border border-[#E9E3D7] bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1f2933]">
                About this property
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {meta?.summary ??
                  "A modern Flex Living residence thoughtfully designed for longer stays with elevated amenities and effortless access to central London."}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {meta?.longDescription ??
                  "From checked bedding to work-friendly nooks, every detail is prepared to make your stay simple, comfortable, and flexible."}
              </p>
            </article>

            <article className="rounded-3xl border border-[#E9E3D7] bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1f2933]">
                  Amenities
                </h2>
                <button className="rounded-full border border-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                  View all amenities
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {amenities.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Amenity information coming soon for this Flex Living home.
                  </p>
                )}
                {amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-700"
                  >
                    {amenity}
                  </div>
                ))}
              </div>
            </article>

            {highlights.length > 0 && (
              <article className="rounded-3xl border border-[#E9E3D7] bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1f2933]">
                  What guests love
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800"
                    >
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )}

            {policies.length > 0 && (
              <article className="rounded-3xl border border-[#E9E3D7] bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1f2933]">
                  Stay policies
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {policies.map((policy) => (
                    <div
                      key={policy.title}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5"
                    >
                      <h3 className="text-sm font-semibold text-emerald-800">
                        {policy.title}
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {policy.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </article>
            )}

            <article className="rounded-3xl border border-[#E9E3D7] bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1f2933]">
                  Guest reviews
                </h2>
                <Link
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                  href="/dashboard"
                >
                  Manage approvals
                </Link>
              </div>
              {reviews.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
                  Approved reviews will be displayed here once a manager selects
                  them in the dashboard.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {categoryAverages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {categoryAverages.map((category) => (
                        <span
                          key={category.key}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800"
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
                        className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>
                            {new Date(
                              review.submittedAt,
                            ).toLocaleDateString(undefined, {
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
                          {review.text ??
                            "This guest left a private score without a public comment."}
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

            <article className="rounded-3xl border border-[#E9E3D7] bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1f2933]">Location</h2>
              <p className="mt-2 text-sm text-slate-600">
                {meta?.location ??
                  "Located within minutes of central London with quick access to the underground and local amenities."}
              </p>
              <div className="mt-4 overflow-hidden rounded-3xl border border-[#E9E3D7]">
                <iframe
                  title="Property location map"
                  src={googleMapEmbedUrl}
                  width="100%"
                  height="320"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </article>
          </section>

          <aside className="space-y-6">
            <div className="sticky top-28 space-y-6">
              <div className="rounded-3xl border border-[#E1D8C8] bg-white p-6 shadow-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">
                  Book your stay
                </p>
                <p className="mt-3 text-3xl font-semibold text-emerald-800">
                  GBP {meta?.nightlyRate ?? 0}
                  <span className="text-base font-normal text-slate-500">
                    {" "}
                    / night
                  </span>
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
                <button className="mt-6 w-full rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
                  Request to book
                </button>
                <button className="mt-3 w-full rounded-full border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                  Send inquiry
                </button>
                <p className="mt-4 text-xs text-slate-500">
                  Instant booking available for verified Flex Living partners.
                </p>
              </div>
              <div className="rounded-3xl border border-[#E1D8C8] bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-emerald-800">
                  Why book with Flex
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Flexible stay lengths and fully furnished homes
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    24/7 guest support from the Flex Living team
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Professionally cleaned between every stay
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
