import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await prisma.savedItem.findMany({
    where: { userId: session.user.id },
    include: {
      item: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    saved.map((s) => ({
      id: s.id,
      itemId: s.item.id,
      title: s.item.title,
      type: s.item.type,
      year: s.item.year,
    }))
  );
}
