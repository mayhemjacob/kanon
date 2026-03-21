import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

const MAX_ALLOCATION_ATTEMPTS = 10;

function newPublicShareId(): string {
  // hex is URL-safe and avoids Buffer encoding quirks across Node versions
  return randomBytes(24).toString("hex");
}

function isUniqueConstraintError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === "P2002";
  }
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

/**
 * Ensures a review has a publicShareId and returns the path /r/[publicShareId].
 * No ownership check — any authenticated user may call (MVP).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reviewId } = await params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { publicShareId: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.publicShareId) {
      return NextResponse.json({ path: `/r/${review.publicShareId}` });
    }

    for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
      try {
        const candidate = newPublicShareId();
        const updated = await prisma.review.updateMany({
          where: { id: reviewId, publicShareId: null },
          data: { publicShareId: candidate },
        });

        if (updated.count === 1) {
          return NextResponse.json({ path: `/r/${candidate}` });
        }

        const afterRace = await prisma.review.findUnique({
          where: { id: reviewId },
          select: { publicShareId: true },
        });
        if (afterRace?.publicShareId) {
          return NextResponse.json({ path: `/r/${afterRace.publicShareId}` });
        }
      } catch (e) {
        if (isUniqueConstraintError(e)) {
          continue;
        }
        console.error("[POST /api/reviews/[id]/share]", e);
        return NextResponse.json(
          { error: "Could not create share link" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Could not allocate share id" },
      { status: 500 }
    );
  } catch (e) {
    console.error("[POST /api/reviews/[id]/share] unhandled", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
