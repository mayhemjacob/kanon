import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { getListById } from "@/lib/lists"
import { isListSavedByUser } from "@/lib/savedLists"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { ListOwnerPageClient } from "./ListOwnerPageClient"

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const list = await getListById(listId, session.user.id)
  if (!list) notFound()
  if (list.ownerId !== session.user.id) notFound()

  const savedRow = await isListSavedByUser(session.user.id, list.id)

  const initialItems = list.items.map((row) => ({
    id: row.id,
    position: row.position,
    item: {
      id: row.item.id,
      title: row.item.title,
      year: row.item.year ?? null,
      type: row.item.type as "FILM" | "SHOW" | "BOOK",
      imageUrl: row.item.imageUrl ?? null,
      director: row.item.director ?? null,
    },
  }))

  return (
    <ListOwnerPageClient
      listId={list.id}
      title={list.title}
      description={list.description ?? null}
      curator={{
        image: list.owner.image ?? null,
        handle: list.owner.handle ?? null,
        name: list.owner.name ?? null,
      }}
      initialSaved={savedRow}
      initialItems={initialItems}
    />
  )
}
