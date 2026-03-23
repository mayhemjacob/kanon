import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { MediaTypeIcon } from "@/app/lists/components/MediaTypeIcon"
import { getPublicListById } from "@/lib/lists"
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl"

import type { ItemType } from "@/app/components/ItemCard"

function typeLabel(type: ItemType): string {
  if (type === "SHOW") return "Series"
  if (type === "FILM") return "Film"
  return "Book"
}

function creditLine(type: ItemType, director: string | null): string | null {
  const d = director?.trim()
  if (!d) return null
  if (type === "BOOK") return `By ${d}`
  return `Dir. ${d}`
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  const list = await getPublicListById(listId)

  if (!list) notFound()

  const curatorLabel = list.owner.handle ? `@${list.owner.handle}` : list.owner.name || "Member"
  const avatarSrc = normalizeItemImageUrlForNext(list.owner.image ?? null)

  return (
    <main className="min-h-screen bg-white pb-10">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 sm:pt-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{list.title}</h1>
        {list.description?.trim() ? (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">{list.description}</p>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-200">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt=""
                fill
                className="object-cover"
                sizes="44px"
                unoptimized={avatarSrc.startsWith("data:") || avatarSrc.startsWith("blob:")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-500">
                {curatorLabel.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Curated by</p>
            {list.owner.handle ? (
              <Link href={`/profile/${list.owner.handle}`} className="font-semibold text-zinc-900 hover:underline">
                {curatorLabel}
              </Link>
            ) : (
              <p className="font-semibold text-zinc-900">{curatorLabel}</p>
            )}
          </div>
        </div>

        <hr className="my-6 border-zinc-200" />

        <p className="text-xs text-zinc-500">
          {list.items.length} {list.items.length === 1 ? "item" : "items"}
        </p>

        <ul className="mt-4 space-y-4">
          {list.items.map((row) => {
            const type = row.item.type as ItemType
            const src = normalizeItemImageUrlForNext(row.item.imageUrl)
            const credit = creditLine(type, row.item.director ?? null)
            return (
              <li
                key={row.id}
                className="relative overflow-hidden rounded-2xl bg-zinc-50 p-4 pl-[4.25rem] sm:pl-[4.5rem]"
              >
                <span
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-5xl font-semibold tabular-nums leading-none text-zinc-200 sm:text-[3.5rem]"
                  aria-hidden
                >
                  {row.position + 1}
                </span>
                <div className="flex gap-4">
                  <div className="relative h-[7rem] w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-200 sm:h-[7.5rem] sm:w-[3.35rem]">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 48px, 54px"
                        unoptimized={src.startsWith("data:") || src.startsWith("blob:")}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <Link
                      href={`/items/${row.item.id}`}
                      className="text-base font-semibold leading-snug text-zinc-900 hover:underline sm:text-lg"
                    >
                      {row.item.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700">
                        <MediaTypeIcon type={type} className="h-3.5 w-3.5 text-zinc-500" />
                        {typeLabel(type)}
                      </span>
                      {row.item.year ? <span className="text-sm text-zinc-500">{row.item.year}</span> : null}
                    </div>
                    {credit ? <p className="mt-2 text-sm text-zinc-500">{credit}</p> : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
