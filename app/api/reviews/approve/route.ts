import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  let extId: string | null = null;
  let approved: boolean | null = null;

  try {
    const body = await req.json();
    extId = typeof body?.extId === "string" ? body.extId : null;
    approved =
      typeof body?.approved === "boolean" ? (body.approved as boolean) : null;
  } catch {
    // body parsing error handled below
  }

  if (!extId || approved === null) {
    return NextResponse.json(
      { error: "extId and approved are required." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.review.update({
      where: { extId },
      data: { approved },
      include: { listing: true },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/properties/${updated.listing.slug}`);

    return NextResponse.json({
      ok: true,
      extId: updated.extId,
      approved: updated.approved,
      listingSlug: updated.listing.slug,
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: `Review with extId ${extId} not found.` },
        { status: 404 },
      );
    }
    throw error;
  }
}
