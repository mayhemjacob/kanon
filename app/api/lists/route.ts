import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { createList, getListsForUser } from "@/lib/lists"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const lists = await getListsForUser(session.user.id)
    return NextResponse.json(lists)
  } catch {
    return NextResponse.json({ error: "Could not load lists" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const rawTitle = typeof body?.title === "string" ? body.title : ""
  const rawDescription = typeof body?.description === "string" ? body.description : ""
  const rawItemIds: unknown[] = Array.isArray(body?.itemIds) ? body.itemIds : []

  const title = rawTitle.trim()
  const description = rawDescription.trim() || null
  const itemIds = rawItemIds
    .map((id: unknown) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean)

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  try {
    const list = await createList(session.user.id, {
      title,
      description,
      visibility: "PRIVATE",
      itemIds,
    })
    return NextResponse.json({ id: list.id }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create list"
    return NextResponse.json(
      {
        error: "Could not create list",
        details:
          process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    )
  }
}
