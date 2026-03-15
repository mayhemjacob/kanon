import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(handle);
}

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

  type UserSelect = {
    handle: string | null;
    image: string | null;
    bio?: string | null;
    _count: { followers: number; following: number };
  };

  let user: UserSelect | null = null;

  try {
    user = await prisma.user.findUnique({
      where,
      select: {
        handle: true,
        image: true,
        bio: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    }) as UserSelect | null;
  } catch (err) {
    // If bio column doesn't exist yet (e.g. migration not run), fetch without it
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("bio") || msg.includes("Unknown column") || msg.includes("does not exist")) {
      user = await prisma.user.findUnique({
        where,
        select: {
          handle: true,
          image: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
      }) as UserSelect | null;
    } else {
      throw err;
    }
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    handle: user.handle ?? null,
    image: user.image ?? null,
    bio: "bio" in user ? (user.bio ?? null) : null,
    followers: user._count.followers,
    following: user._count.following,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: { handle?: string | null; image?: string | null; bio?: string | null } = {};

  const existingUser = await prisma.user.findUnique({
    where:
      session.user.id != null
        ? { id: session.user.id }
        : session.user.email
        ? { email: session.user.email }
        : { id: "" },
    select: { id: true },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = existingUser.id;

  if (typeof body.handle === "string") {
    const rawHandle = body.handle.replace(/^@/, "");
    const normalized = normalizeHandle(rawHandle);

    if (!isValidHandle(normalized)) {
      return NextResponse.json(
        {
          error:
            "Handle must be 3–20 characters, lowercase letters/numbers/underscores only.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        handle: normalized,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "That handle is already in use." },
        { status: 409 },
      );
    }

    updates.handle = normalized;
  }

  if (typeof body.image === "string" || body.image === null) {
    updates.image = body.image ?? null;
  }

  if (typeof body.bio === "string" || body.bio === null) {
    const bio = body.bio === null ? null : String(body.bio).slice(0, 150).trim() || null;
    updates.bio = bio;
  }

  if (!("handle" in updates) && !("image" in updates) && !("bio" in updates)) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        handle: true,
        image: true,
        bio: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    return NextResponse.json({
      handle: user.handle ?? null,
      image: user.image ?? null,
      bio: user.bio ?? null,
      followers: user._count.followers,
      following: user._count.following,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isBioColumnMissing =
      "bio" in updates &&
      (msg.includes("bio") || msg.includes("Unknown column") || msg.includes("does not exist"));

    if (isBioColumnMissing) {
      console.error("[PATCH /api/me] bio update failed:", err);
      return NextResponse.json(
        {
          error:
            "Bio is not available yet. Run in your project: npx prisma db push",
        },
        { status: 503 }
      );
    }
    throw err;
  }
}

