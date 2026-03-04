import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;

  try {
    const existing = await prisma.savedItem.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
    });

    if (existing) {
      await prisma.savedItem.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ saved: false });
    }

    await prisma.savedItem.create({
      data: {
        userId: session.user.id,
        itemId,
      },
    });
    return NextResponse.json({ saved: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not update save state" },
      { status: 500 }
    );
  }
}
