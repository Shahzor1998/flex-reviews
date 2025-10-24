import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { normalizeHostaway, type NormalizedReview } from "@/lib/normalize";
import {
  fetchHostawayPayloadFromApi,
  loadMockHostawayPayload,
} from "@/lib/hostaway";
import { safeJsonRecord } from "@/lib/utils";

type ApiReview = NormalizedReview & { approved: boolean };

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

function buildSummary(reviews: ApiReview[]): SummaryRow[] {
  const map = new Map<string, SummaryRow & { ratingAccumulator: number; ratingCount: number }>();

  for (const review of reviews) {
    const existing = map.get(review.listingSlug);
    if (!existing) {
      map.set(review.listingSlug, {
        listingSlug: review.listingSlug,
        listingName: review.listingName,
        channel: review.channel,
        reviewCount: 1,
        approvedCount: review.approved ? 1 : 0,
        pendingCount: review.approved ? 0 : 1,
        averageRating: review.rating ?? null,
        latestReviewAt: review.submittedAt,
        ratingAccumulator: review.rating ?? 0,
        ratingCount: review.rating != null ? 1 : 0,
      });
    } else {
      existing.reviewCount += 1;
      existing.approvedCount += review.approved ? 1 : 0;
      existing.pendingCount += review.approved ? 0 : 1;
      if (review.rating != null) {
        existing.ratingAccumulator += review.rating;
        existing.ratingCount += 1;
      }
      if (
        !existing.latestReviewAt ||
        new Date(review.submittedAt) > new Date(existing.latestReviewAt)
      ) {
        existing.latestReviewAt = review.submittedAt;
      }
    }
  }

  return Array.from(map.values())
    .map((row) => ({
      listingSlug: row.listingSlug,
      listingName: row.listingName,
      channel: row.channel,
      reviewCount: row.reviewCount,
      approvedCount: row.approvedCount,
      pendingCount: row.pendingCount,
      averageRating:
        row.ratingCount > 0
          ? Number((row.ratingAccumulator / row.ratingCount).toFixed(2))
          : null,
      latestReviewAt: row.latestReviewAt,
    }))
    .sort((a, b) => a.listingName.localeCompare(b.listingName));
}

async function readFromDatabase(filters: {
  listingSlug?: string;
  approved?: boolean;
  from?: Date;
  to?: Date;
  sortField: "submittedAt" | "rating";
  sortDirection: "asc" | "desc";
}): Promise<ApiReview[]> {
  const where: Prisma.ReviewWhereInput = {};

  if (filters.listingSlug) {
    where.listing = { is: { slug: filters.listingSlug } };
  }

  if (typeof filters.approved === "boolean") {
    where.approved = filters.approved;
  }

  if (filters.from || filters.to) {
    where.submittedAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  const rows = await prisma.review.findMany({
    where,
    include: { listing: true },
    orderBy: {
      [filters.sortField]: filters.sortDirection,
    },
  });

  return rows.map((row) => {
    const categories = safeJsonRecord(row.categories);
    return {
      extId: row.extId,
      provider: row.provider as "hostaway",
      channel: row.listing.channel,
      type: row.type,
      status: row.status,
      rating: row.rating,
      categories,
      submittedAt: row.submittedAt.toISOString(),
      author: row.author,
      text: row.text,
      listingName: row.listing.name,
      listingSlug: row.listing.slug,
      approved: row.approved,
    };
  });
}

async function readFromMock(): Promise<ApiReview[]> {
  const payload = await loadMockHostawayPayload();
  return normalizeHostaway(payload).map((review) => ({
    ...review,
    approved: false,
  }));
}

async function readFromApi(): Promise<ApiReview[]> {
  const payload = await fetchHostawayPayloadFromApi();
  return normalizeHostaway(payload).map((review) => ({
    ...review,
    approved: false,
  }));
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const raw = searchParams.get("raw");
  const sourceParam = searchParams.get("source");
  const listingSlug = searchParams.get("listingSlug") ?? undefined;
  const approvedParam = searchParams.get("approved");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const sortParam = searchParams.get("sort") ?? "submittedAt:desc";

  const [sortField, sortDirection] = sortParam.split(":") as [
    "submittedAt" | "rating",
    "asc" | "desc",
  ];
  const sort =
    sortField === "rating"
      ? { sortField: "rating" as const, sortDirection: sortDirection ?? "desc" }
      : { sortField: "submittedAt" as const, sortDirection: sortDirection ?? "desc" };

  const approvedFilter =
    approvedParam === "true"
      ? true
      : approvedParam === "false"
      ? false
      : undefined;

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;

  const shouldReturnRaw = raw === "1" || sourceParam === "mock";

  if (shouldReturnRaw) {
    const reviews = await readFromMock();
    return NextResponse.json({
      provider: "hostaway",
      source: "mock",
      count: reviews.length,
      reviews,
      summary: buildSummary(reviews),
    });
  }

  if (sourceParam === "api") {
    try {
      const reviews = await readFromApi();
      return NextResponse.json({
        provider: "hostaway",
        source: "api",
        count: reviews.length,
        reviews,
        summary: buildSummary(reviews),
      });
    } catch (error) {
      const fallbackReviews = await readFromMock();
      return NextResponse.json(
        {
          provider: "hostaway",
          source: "mock",
          fallback: "api",
          error:
            error instanceof Error
              ? error.message
              : "Unable to fetch Hostaway API.",
          count: fallbackReviews.length,
          reviews: fallbackReviews,
          summary: buildSummary(fallbackReviews),
        },
        { status: 502 },
      );
    }
  }

  const reviews = await readFromDatabase({
    listingSlug,
    approved: approvedFilter,
    from: fromDate,
    to: toDate,
    sortField: sort.sortField,
    sortDirection: sort.sortDirection,
  });

  return NextResponse.json({
    provider: "hostaway",
    source: "database",
    count: reviews.length,
    filters: {
      listingSlug,
      approved: approvedFilter,
      from: fromParam,
      to: toParam,
      sort: `${sort.sortField}:${sort.sortDirection}`,
    },
    reviews,
    summary: buildSummary(reviews),
  });
}

export async function POST(req: NextRequest) {
  let source: "api" | "mock" = "mock";
  let requestedSource: "api" | "mock" = "mock";

  try {
    const body = await req.json();
    if (body?.source === "api") {
      source = "api";
      requestedSource = "api";
    }
  } catch {
    // ignore malformed body; default to mock
  }

  let reviews: NormalizedReview[] = [];
  let errorMessage: string | undefined;

  try {
    const payload =
      source === "api"
        ? await fetchHostawayPayloadFromApi()
        : await loadMockHostawayPayload();
    reviews = normalizeHostaway(payload);
  } catch (error) {
    if (source === "api") {
      source = "mock";
      errorMessage =
        error instanceof Error ? error.message : "Unable to reach Hostaway API.";
      const payload = await loadMockHostawayPayload();
      reviews = normalizeHostaway(payload);
    } else {
      throw error;
    }
  }

  const grouped = new Map<
    string,
    { listingName: string; channel: string; reviews: NormalizedReview[] }
  >();

  for (const review of reviews) {
    const group = grouped.get(review.listingSlug);
    if (group) {
      group.reviews.push(review);
    } else {
      grouped.set(review.listingSlug, {
        listingName: review.listingName,
        channel: review.channel,
        reviews: [review],
      });
    }
  }

  const listingMap = new Map<string, { id: number; name: string; channel: string }>();

  for (const [slug, value] of grouped) {
    const listing = await prisma.listing.upsert({
      where: { slug },
      update: {
        name: value.listingName,
        channel: value.channel,
      },
      create: {
        slug,
        name: value.listingName,
        channel: value.channel,
      },
    });
    listingMap.set(slug, { id: listing.id, name: listing.name, channel: listing.channel });
  }

  await prisma.$transaction(
    reviews.map((review) =>
      prisma.review.upsert({
        where: { extId: review.extId },
        update: {
          type: review.type,
          status: review.status,
          rating: review.rating,
          categories: review.categories ?? Prisma.DbNull,
          submittedAt: new Date(review.submittedAt),
          author: review.author,
          text: review.text,
          listingId: listingMap.get(review.listingSlug)!.id,
        },
        create: {
          extId: review.extId,
          provider: review.provider,
          type: review.type,
          status: review.status,
          rating: review.rating,
          categories: review.categories ?? Prisma.DbNull,
          submittedAt: new Date(review.submittedAt),
          author: review.author,
          text: review.text,
          listingId: listingMap.get(review.listingSlug)!.id,
        },
      }),
    ),
  );

  const dbReviews = await readFromDatabase({
    sortField: "submittedAt",
    sortDirection: "desc",
  });

  return NextResponse.json({
    ok: true,
    provider: "hostaway",
    requestedSource,
    source,
    error: errorMessage,
    count: dbReviews.length,
    summary: buildSummary(dbReviews),
  });
}
