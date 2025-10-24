"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";

type ApiReview = {
  extId: string;
  provider: string;
  channel: string;
  type: string;
  status: string;
  rating: number | null;
  categories: Record<string, number | null> | null;
  submittedAt: string;
  author: string | null;
  text: string | null;
  listingName: string;
  listingSlug: string;
  approved: boolean;
};

type SummaryRow = {
  listingSlug: string;
  listingName: string;
  channel: string;
  reviewCount: number;
  approvedCount: number;
  pendingCount: number;
  averageRating: number | null;
  latestReviewAt: string | null;
};

type ApiResponse = {
  reviews: ApiReview[];
  summary: SummaryRow[];
  count: number;
  provider: string;
  source: string;
};

const SORT_OPTIONS = [
  { value: "submittedAt:desc", label: "Newest first" },
  { value: "submittedAt:asc", label: "Oldest first" },
  { value: "rating:desc", label: "Highest rating" },
  { value: "rating:asc", label: "Lowest rating" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const [filters, setFilters] = useState({
    search: "",
    listingSlug: "all",
    approval: "all",
    category: "all",
    minRating: 0,
    maxRating: 10,
    from: "",
    to: "",
    sort: "submittedAt:desc",
  });
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (filters.listingSlug !== "all") params.set("listingSlug", filters.listingSlug);
  if (filters.approval === "approved") params.set("approved", "true");
  if (filters.approval === "pending") params.set("approved", "false");
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("sort", filters.sort);

  const queryKey = `/api/reviews/hostaway${params.toString() ? `?${params.toString()}` : ""}`;

  const { data, error, isValidating, mutate } = useSWR<ApiResponse>(
    queryKey,
    fetcher,
    { revalidateOnFocus: false },
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    data?.reviews?.forEach((review) => {
      if (review.categories) {
        for (const key of Object.keys(review.categories)) {
          set.add(key);
        }
      }
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredReviews = useMemo(() => {
    if (!data?.reviews) return [];
    return data.reviews
      .filter((review) => {
        if (!filters.search) return true;
        const needle = filters.search.toLowerCase();
        return (
          review.listingName.toLowerCase().includes(needle) ||
          (review.text ?? "").toLowerCase().includes(needle) ||
          (review.author ?? "").toLowerCase().includes(needle)
        );
      })
      .filter((review) => {
        if (filters.category === "all" || !review.categories) return true;
        return review.categories[filters.category] != null;
      })
      .filter((review) => {
        if (review.rating == null) return filters.minRating === 0;
        if (filters.minRating && review.rating < filters.minRating) return false;
        if (filters.maxRating !== 10 && review.rating > filters.maxRating)
          return false;
        return true;
      });
  }, [data, filters.search, filters.category, filters.minRating, filters.maxRating]);

  const summaryCards = data?.summary ?? [];

  async function handleToggle(extId: string, approved: boolean) {
    setErrorMessage(null);
    setOptimistic((prev) => ({ ...prev, [extId]: approved }));
    try {
      const response = await fetch("/api/reviews/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extId, approved }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to update review.");
      }
      await mutate();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[extId];
        return next;
      });
    }
  }

  function resetFilters() {
    setFilters({
      search: "",
      listingSlug: "all",
      approval: "all",
      category: "all",
      minRating: 0,
      maxRating: 10,
      from: "",
      to: "",
      sort: "submittedAt:desc",
    });
  }

  const appliedListing = filters.listingSlug;
  const listingName =
    appliedListing === "all"
      ? "All properties"
      : summaryCards.find((item) => item.listingSlug === appliedListing)?.listingName;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-emerald-900">
            Reviews dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Monitor guest sentiment, approve testimonials, and spot properties that
            need extra attention.
          </p>
        </div>
        {isValidating && (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
            Syncing latest data...
          </span>
        )}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <article
            key={item.listingSlug}
            className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">
                  {item.channel}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {item.listingName}
                </h2>
              </div>
              {item.averageRating != null && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {item.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <dt>Total reviews</dt>
                <dd className="font-medium text-slate-900">{item.reviewCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Approved</dt>
                <dd className="font-medium text-emerald-700">{item.approvedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Pending</dt>
                <dd className="font-medium text-amber-600">{item.pendingCount}</dd>
              </div>
            </dl>
            {item.latestReviewAt && (
              <p className="mt-4 text-xs text-slate-500">
                Last review on{" "}
                {new Date(item.latestReviewAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <Link
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"
              href={`/properties/${item.listingSlug}`}
            >
              View property
              <span aria-hidden>{`->`}</span>
            </Link>
          </article>
        ))}
        {summaryCards.length === 0 && (
          <article className="rounded-3xl border border-dashed border-emerald-200 bg-white p-6 text-sm text-slate-600">
            No reviews have been ingested yet. Seed the database or import data to
            populate this view.
          </article>
        )}
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Filters &amp; sorting
            </h2>
            <p className="text-sm text-slate-600">
              {listingName}
              {filters.approval !== "all" && ` - ${filters.approval} only`}
            </p>
          </div>
          <button
            onClick={resetFilters}
            className="rounded-full border border-transparent bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Search
            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Search by property, reviewer, or keywords"
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Property
            <select
              value={filters.listingSlug}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, listingSlug: event.target.value }))
              }
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">All listings</option>
              {summaryCards.map((item) => (
                <option key={item.listingSlug} value={item.listingSlug}>
                  {item.listingName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Approval status
            <select
              value={filters.approval}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, approval: event.target.value }))
              }
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">Approved + pending</option>
              <option value="approved">Approved only</option>
              <option value="pending">Pending approval</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Sort reviews
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sort: event.target.value }))
              }
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Category
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, category: event.target.value }))
              }
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-emerald-200 p-4 xl:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Minimum rating: {filters.minRating.toFixed(1)}
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={filters.minRating}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  minRating: Math.min(Number(event.target.value), prev.maxRating),
                }))
              }
            />
            <span className="text-sm font-medium text-slate-700">
              Maximum rating: {filters.maxRating.toFixed(1)}
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={filters.maxRating}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  maxRating: Math.max(Number(event.target.value), prev.minRating),
                }))
              }
            />
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            From date
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, from: event.target.value }))
              }
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            To date
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, to: event.target.value }))
              }
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
        </div>
        {errorMessage && (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {errorMessage}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Failed to load reviews. Refresh the page or try again later.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {filteredReviews.length} review
            {filteredReviews.length === 1 ? "" : "s"} matched your filters
          </h2>
          <span className="text-sm text-slate-500">
            Data source: {data?.source ?? "unknown"}
          </span>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredReviews.map((review) => {
            const optimisticValue =
              optimistic[review.extId] ?? review.approved;
            const isApproved = optimisticValue === true;
            return (
              <article
                key={review.extId}
                className="flex flex-col justify-between rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-emerald-600">
                        {review.channel}
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {review.listingName}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isApproved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span>
                      {review.rating != null ? `${review.rating.toFixed(1)} rating` : "No rating"}
                    </span>
                    <span>-</span>
                    <span>
                      {new Date(review.submittedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {review.author && (
                      <>
                        <span>-</span>
                        <span>by {review.author}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {review.text || "No public comment was provided."}
                  </p>
                  {review.categories && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(review.categories).map(([category, value]) => (
                        <span
                          key={category}
                          className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                        >
                          {category.replaceAll("_", " ")}:{" "}
                          <span className="ml-1 font-semibold">
                            {value != null ? value : "n/a"}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleToggle(review.extId, true)}
                    disabled={isApproved}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isApproved
                        ? "cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleToggle(review.extId, false)}
                    disabled={!isApproved}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      !isApproved
                        ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-500"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Unapprove
                  </button>
                  <Link
                    href={`/properties/${review.listingSlug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-transparent bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    View property
                    <span aria-hidden>{`->`}</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        {filteredReviews.length === 0 && (
          <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-8 text-center text-sm text-slate-600">
            No reviews match your filters yet. Adjust the filters above or import
            more data.
          </div>
        )}
      </section>
    </div>
  );
}



