import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { deleteList, updateListBasicFields } from "@/lib/lists"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

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

  const rawTitle = typeof body?.title === "string" ? body.title : undefined
  const rawDescription =
    typeof body?.description === "string" ? body.description : undefined

  const updates: {
    title?: string
    description?: string | null
    visibility: "PUBLIC"
  } = { visibility: "PUBLIC" }

  if (rawTitle !== undefined) updates.title = rawTitle
  if (rawDescription !== undefined) updates.description = rawDescription

  try {
    const list = await updateListBasicFields(listId, session.user.id, updates)
    return NextResponse.json({
      id: list.id,
      title: list.title,
      description: list.description,
      visibility: list.visibility,
    })
  } catch (err) {
    if (err instanceof Error && err.message === "List not found") {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (err instanceof Error && err.message === "List title is required") {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Could not update list" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { listId } = await params

  try {
    await deleteList(listId, session.user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === "List not found") {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Could not delete list" }, { status: 500 })
  }
}
