import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { addListItem, removeListItem, reorderListItems } from "@/lib/lists"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { listId } = await params
  const body = await req.json().catch(() => ({}))
  const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : ""

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 })
  }

  try {
    const row = await addListItem(listId, session.user.id, itemId)
    return NextResponse.json({
      id: row.id,
      listId: row.listId,
      itemId: row.itemId,
      position: row.position,
      item: {
        id: row.item.id,
        title: row.item.title,
        year: row.item.year ?? null,
        type: row.item.type,
        imageUrl: row.item.imageUrl ?? null,
        director: row.item.director ?? null,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === "List not found") {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Item already in list" }, { status: 409 })
    }
    return NextResponse.json({ error: "Could not add item" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { listId } = await params
  const body = await req.json().catch(() => ({}))
  const raw = body?.orderedItemIds
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "orderedItemIds array is required" }, { status: 400 })
  }

  const orderedItemIds = raw
    .map((id: unknown) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean)

  try {
    const updated = await reorderListItems(listId, session.user.id, orderedItemIds)
    return NextResponse.json({
      items: updated.items.map((row) => ({
        id: row.id,
        position: row.position,
        item: {
          id: row.item.id,
          title: row.item.title,
          year: row.item.year ?? null,
          type: row.item.type,
          imageUrl: row.item.imageUrl ?? null,
          director: row.item.director ?? null,
        },
      })),
    })
  } catch (err) {
    if (err instanceof Error && err.message === "List not found") {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (
      err instanceof Error &&
      (err.message === "Ordered item ids length mismatch" ||
        err.message === "Ordered item ids must exactly match current list items")
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Could not reorder items" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { listId } = await params
  const body = await req.json().catch(() => ({}))
  const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : ""

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 })
  }

  try {
    const removed = await removeListItem(listId, session.user.id, itemId)
    if (!removed) {
      return NextResponse.json({ error: "Item not found in list" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === "List not found") {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Could not remove item" }, { status: 500 })
  }
}
