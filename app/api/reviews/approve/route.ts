import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { extId, approved } = body as { extId: string; approved: boolean };
    if (!extId) return NextResponse.json({ error: "extId required" }, {
        status: 400
    });
    const updated = await prisma.review.update({
        where: { extId },
        data: { approved }
    });
    return NextResponse.json({
        ok: true, extId: updated.extId, approved:
            updated.approved
    });
}
