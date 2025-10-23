import { prisma } from "@/lib/db";


export default async function PropertyPage({ params }: { params: { slug: string } }) {
    const listing = await prisma.listing.findUnique({ where: { slug: params.slug } });
    if (!listing) return <div className="p-6">Listing not found</div>;
    const reviews = await prisma.review.findMany({
        where: { listingId: listing.id, approved: true },
        orderBy: { submittedAt: "desc" }
    });

    return (
        <main className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold">{listing.name}</h1>

            <section>
                <h2 className="text-xl font-medium">Guest Reviews</h2>
                {reviews.length === 0 ? (
                    <p className="opacity-70 mt-2">No approved reviews yet.</p>
                ) : (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reviews.map(r => (
                            <article key={r.extId} className="border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Rating: {r.rating ?? "—"}</span>
                                    <span className="text-sm opacity-70">{new Date(r.submittedAt).toLocaleDateString()}</span>
                                </div>
                                <p className="mt-2 text-sm">{r.text || "(no text)"}</p>
                                <div className="mt-2 text-xs opacity-70">by {r.author || "Anonymous"}</div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}