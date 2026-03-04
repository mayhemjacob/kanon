import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const handle = (body?.handle as string | undefined)?.trim().toLowerCase();

  if (!handle || !/^[a-z0-9_]{3,20}$/.test(handle)) {
    return NextResponse.json(
      { error: "Invalid handle format" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        handle,
        hasOnboarded: true,
      },
    });

    return NextResponse.json({ id: user.id, handle: user.handle });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not save profile" },
      { status: 500 },
    );
  }
}

