"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl"

export type ProfileListPreview = {
  id: string
  title: string
  description: string | null
  itemCount: number
  saved?: boolean
  ownerHandle?: string | null
  ownerName?: string | null
  href?: string
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

export function ProfileListCard({
  list,
  onSavedChange,
  showSaveButton = true,
}: {
  list: ProfileListPreview
  onSavedChange?: (listId: string, saved: boolean) => void
  showSaveButton?: boolean
}) {
  const desc = clampDescription(list.description)
  const [saved, setSaved] = useState(Boolean(list.saved))
  const [saveBusy, setSaveBusy] = useState(false)

  useEffect(() => {
    setSaved(Boolean(list.saved))
  }, [list.saved])

  const destination = list.href ?? `/lists/${list.id}`

  async function toggleSave(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (saveBusy) return

    const optimisticSaved = !saved
    setSaveBusy(true)
    setSaved(optimisticSaved)
    onSavedChange?.(list.id, optimisticSaved)
    try {
      const res = await fetch(`/api/lists/${encodeURIComponent(list.id)}/save`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Could not update")
      const data = await res.json().catch(() => null)
      if (!data || typeof data.saved !== "boolean") throw new Error("Could not update")
      setSaved(data.saved)
      if (data.saved !== optimisticSaved) onSavedChange?.(list.id, data.saved)
    } catch {
      setSaved(!optimisticSaved)
      onSavedChange?.(list.id, !optimisticSaved)
    } finally {
      setSaveBusy(false)
    }
  }

  return (
    <Link
      href={destination}
      className="relative block rounded-2xl border border-zinc-100 bg-white p-2.5 transition-colors hover:bg-zinc-50"
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

      {showSaveButton ? (
        <button
          type="button"
          onClick={toggleSave}
          disabled={saveBusy}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full ${
            saved ? "bg-zinc-900 text-white" : "bg-white/95 text-zinc-700"
          } shadow-sm ring-1 ring-black/5 hover:bg-zinc-900 hover:text-white disabled:opacity-60`}
          aria-label={saved ? "Unsave list" : "Save list"}
        >
          {saved ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
            </svg>
          )}
        </button>
      ) : null}

      <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-zinc-900">
        {list.title}
      </h3>
      {list.ownerHandle || list.ownerName ? (
        <p className="mt-1 text-xs text-zinc-500">
          by {list.ownerHandle ? `@${list.ownerHandle}` : list.ownerName}
        </p>
      ) : null}
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
