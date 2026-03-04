import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { itemId, rating, body: text } = body ?? {};

  if (!itemId || typeof rating !== "number") {
    return NextResponse.json(
      { error: "Missing itemId or rating" },
      { status: 400 },
    );
  }

  const num = Number(rating);
  if (Number.isNaN(num) || num < 1 || num > 10) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 10" },
      { status: 400 },
    );
  }

  try {
    const review = await prisma.review.upsert({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
      update: {
        rating: num,
        body: text ?? null,
      },
      create: {
        userId: session.user.id,
        itemId,
        rating: num,
        body: text ?? null,
      },
    });

    return NextResponse.json(review);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not save review" },
      { status: 500 },
    );
  }
}

