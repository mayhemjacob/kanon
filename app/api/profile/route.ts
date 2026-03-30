import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function isConnectionPoolTimeoutError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2024") {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Unable to check out connection from the pool due to timeout/i.test(msg) ||
    /Timed out fetching a new connection from the connection pool/i.test(msg)
  );
}

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
    if (isConnectionPoolTimeoutError(err)) {
      return NextResponse.json(
        { error: "Service temporarily busy. Please retry." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Could not save profile" },
      { status: 500 },
    );
  }
}

