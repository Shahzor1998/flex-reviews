import { z } from "zod";
const RawCategory = z.object({
    category: z.string(), rating:
        z.number().nullable().optional()
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
export type NormalizedReview = {
    extId: string;
    provider: "hostaway";
    type: string;
    status: string;
    rating: number | null;
    categories: Record<string, number | null>;
    submittedAt: string; // ISO
    author: string | null;
    text: string | null;
    listingName: string;
};
export function normalizeHostaway(payload: any): NormalizedReview[] {
    const arr = Array.isArray(payload?.result) ? payload.result : [];
    return arr.map((r: any) => {
        const parsed = RawReview.parse(r);
        const categories = Object.fromEntries(
            (parsed.reviewCategory || []).map(c => [c.category, c.rating ?? null])
        );
        return {
            extId: String(parsed.id),
            provider: "hostaway" as const,
            type: parsed.type || "",
            status: parsed.status || "",
            rating: parsed.rating ?? null,
            categories,
            submittedAt: new Date(parsed.submittedAt).toISOString(),
            author: parsed.guestName || null,
            text: parsed.publicReview || null,
            listingName: parsed.listingName,
        };
    });
}
