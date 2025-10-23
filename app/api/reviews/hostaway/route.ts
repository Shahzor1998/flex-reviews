import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeHostaway } from "@/lib/normalize";
export async function GET(_req: NextRequest) {
    const { searchParams } = new URL(_req.url);
    const raw = searchParams.get("raw");
    if (raw) {
        // Normalize from file directly
        const fs = await import("fs");
        const path = await import("path");
        const rawPath = path.join(process.cwd(), "data", "hostaway_mock_reviews.json");
        const payload = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
        const normalized = normalizeHostaway(payload);
        return NextResponse.json({
            provider: "hostaway", count: normalized.length,
            reviews: normalized
        });
    }
    // Default: from DB (already normalized at seed time)
    const rows = await prisma.review.findMany({
        include: { listing: true },
        orderBy: { submittedAt: "desc" },
    });
    const normalized = rows.map(r => ({
        extId: r.extId,
        provider: r.provider,
        type: r.type,
        status: r.status,
        rating: r.rating,
        categories: r.categories as Record<string, number | null> | null,
        submittedAt: r.submittedAt.toISOString(),
        author: r.author,
        text: r.text,
        listingName: r.listing.name,
        approved: r.approved,
    }));
    return NextResponse.json({
        provider: "hostaway", 
        count: normalized.length, 
        reviews: normalized
    });
}
