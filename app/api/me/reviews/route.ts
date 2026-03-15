import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    session.user.id != null
      ? { id: session.user.id }
      : session.user.email
      ? { email: session.user.email }
      : null;

  if (!where) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where,
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      itemId: true,
      rating: true,
      createdAt: true,
      item: {
        select: { type: true, title: true, imageUrl: true, year: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    reviews.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      reviewId: r.id,
      type: r.item.type,
      rating: r.rating,
      title: r.item.title,
      imageUrl: r.item.imageUrl ?? null,
      createdAt: r.createdAt,
      year: r.item.year ?? null,
    }))
  );
}
