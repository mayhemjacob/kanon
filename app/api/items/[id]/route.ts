import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      year: true,
      type: true,
      imageUrl: true,
      director: true,
      description: true,
      tags: true,
    },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await prisma.item.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const data: Prisma.ItemUpdateInput = {};
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (typeof body.imageUrl === "string" || body.imageUrl === null) {
    data.imageUrl = body.imageUrl === "" ? null : body.imageUrl;
  }
  if (typeof body.director === "string" || body.director === null) {
    data.director = body.director === "" ? null : body.director;
  }
  if (typeof body.description === "string" || body.description === null) {
    data.description = body.description === "" ? null : body.description;
  }
  if (Array.isArray(body.tags) && body.tags.every((t: unknown) => typeof t === "string")) {
    data.tags = body.tags;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const item = await prisma.item.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        director: true,
        description: true,
        tags: true,
      },
    });

    return NextResponse.json({
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl ?? null,
      director: item.director ?? null,
      description: item.description ?? null,
      tags: item.tags,
    });
  } catch (err) {
    console.error("Item PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update item" },
      { status: 500 }
    );
  }
}
