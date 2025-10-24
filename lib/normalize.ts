import { z } from "zod";
import { slugify } from "./utils";
const RawCategory = z.object({
  category: z.string(),
  rating: z.number().nullable().optional(),
});

const RawReview = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.string().optional(),
  status: z.string().optional(),
  rating: z.number().nullable().optional(),
  publicReview: z.string().nullable().optional(),
  reviewCategory: z.array(RawCategory).optional(),
  submittedAt: z.string(),
  guestName: z.string().nullable().optional(),
  listingName: z.string(),
});

const RawPayload = z.object({
  result: z.array(z.unknown()).optional(),
});
export type NormalizedReview = {
  extId: string;
  provider: "hostaway";
  channel: string;
  type: string;
  status: string;
  rating: number | null;
  categories: Record<string, number | null> | null;
  submittedAt: string; // ISO
  author: string | null;
  text: string | null;
  listingName: string;
  listingSlug: string;
};

export function normalizeHostaway(payload: unknown): NormalizedReview[] {
  const parsedPayload = RawPayload.parse(payload);
  const items = parsedPayload.result ?? [];

  return items.map((item) => {
    const parsed = RawReview.parse(item);
    const categoryEntries = (parsed.reviewCategory || []).map((c) => [
      c.category,
      c.rating ?? null,
    ]);

    const categories =
      categoryEntries.length > 0 ? Object.fromEntries(categoryEntries) : null;

    const listingSlug = slugify(parsed.listingName);

    return {
      extId: String(parsed.id),
      provider: "hostaway" as const,
      channel: "Hostaway" as const,
      type: parsed.type || "",
      status: parsed.status || "",
      rating: parsed.rating ?? null,
      categories,
      submittedAt: new Date(parsed.submittedAt).toISOString(),
      author: parsed.guestName || null,
      text: parsed.publicReview || null,
      listingName: parsed.listingName,
      listingSlug,
    };
  });
}
