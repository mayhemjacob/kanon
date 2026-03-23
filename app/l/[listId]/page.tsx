import { notFound } from "next/navigation"

import { getPublicListById } from "@/lib/lists"

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  const list = await getPublicListById(listId)

  if (!list) notFound()

  const ownerLabel = list.owner.handle ? `@${list.owner.handle}` : list.owner.name || "Member"

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Public list</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{list.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">by {ownerLabel}</p>
        {list.description ? (
          <p className="mt-3 text-sm text-zinc-700">{list.description}</p>
        ) : null}

        <ul className="mt-6 divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
          {list.items.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm text-zinc-800">
              {row.position + 1}. {row.item.title}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
