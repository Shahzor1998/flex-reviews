/* eslint-disable */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { slugify } from "../lib/utils";

const prisma = new PrismaClient();

async function main() {
    const mockPath = path.join(process.cwd(), "data",
        "hostaway_mock_reviews.json");
    const raw = fs.readFileSync(mockPath, "utf-8");
    const parsed = JSON.parse(raw) as {
        status: string;
        result: Array<any>;
    };
    // Group by listingName to create Listings, then Reviews
    const byListing = new Map<string, any[]>();
    for (const r of parsed.result) {
        const arr = byListing.get(r.listingName) || [];
        arr.push(r);
        byListing.set(r.listingName, arr);
    }
    for (const [listingName, reviews] of byListing) {
        const slug = slugify(listingName);
        const listing = await prisma.listing.upsert({
            where: { slug },
            update: {
                name: listingName,
                channel: "Hostaway",
            },
            create: {
                slug,
                name: listingName,
                channel: "Hostaway",
            },
        });
        for (const r of reviews) {
            const categories = (r.reviewCategory || []).reduce((acc: any, c: any) => {
                acc[c.category] = c.rating;
                return acc;
            }, {});
            await prisma.review.upsert({
                where: { extId: String(r.id) },
                update: {
                    type: r.type ?? "",
                    status: r.status ?? "",
                    rating: r.rating ?? null,
                    categories,
                    submittedAt: new Date(r.submittedAt),
                    author: r.guestName ?? null,
                    text: r.publicReview ?? null,
                    listingId: listing.id,
                },
                create: {
                    extId: String(r.id),
                    provider: "hostaway",
                    type: r.type ?? "",
                    status: r.status ?? "",
                    rating: r.rating ?? null,
                    categories,
                    submittedAt: new Date(r.submittedAt),
                    author: r.guestName ?? null,
                    text: r.publicReview ?? null,
                    listingId: listing.id,
                },
            });
        }
    }
    console.log("Seed complete ");
}
main().finally(async () => prisma.$disconnect());
