import Image from "next/image"
import Link from "next/link"

import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl"

export type ProfileListPreview = {
  id: string
  title: string
  description: string | null
  itemCount: number
  previewItems: Array<{
    id: string
    imageUrl: string | null
    type: string
    title: string
  }>
}

function previewTileLabel(type: string): string {
  if (type === "SHOW") return "SERIES"
  return type
}

function clampDescription(description: string | null): string | null {
  const t = description?.trim()
  if (!t) return null
  return t.length > 72 ? `${t.slice(0, 71)}…` : t
}

export function ProfileListCard({ list }: { list: ProfileListPreview }) {
  const desc = clampDescription(list.description)

  return (
    <Link
      href={`/lists/${list.id}`}
      className="block rounded-2xl border border-zinc-100 bg-white p-2.5 transition-colors hover:bg-zinc-50"
    >
      <div className="mb-2.5 grid grid-cols-2 gap-1.5">
        {[0, 1].map((i) => {
          const preview = list.previewItems[i]
          const src = normalizeItemImageUrlForNext(preview?.imageUrl ?? null)
          return (
            <div
              key={preview?.id ?? `placeholder-${i}`}
              className="relative aspect-[5/7] overflow-hidden rounded-lg bg-zinc-100"
            >
              {src ? (
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 44vw, 180px"
                  unoptimized={src.startsWith("data:") || src.startsWith("blob:")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-400">
                  {preview ? previewTileLabel(preview.type) : "Kanon"}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-zinc-900">
        {list.title}
      </h3>
      {desc ? (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{desc}</p>
      ) : (
        <p className="mt-1 text-sm text-zinc-400">No description</p>
      )}

      <div className="mt-2 text-xs text-zinc-500">
        {list.itemCount} {list.itemCount === 1 ? "item" : "items"}
      </div>
    </Link>
  )
}
