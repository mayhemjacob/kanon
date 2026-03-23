"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import type { ItemType } from "@/app/components/ItemCard"
import { MediaTypeIcon } from "@/app/lists/components/MediaTypeIcon"
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl"

const TITLE_MAX = 120
const DESCRIPTION_MAX = 500
type TypeFilter = "All" | "FILM" | "SHOW" | "BOOK"
const typePill: TypeFilter[] = ["All", "FILM", "SHOW", "BOOK"]

type SearchItem = {
  id: string
  title: string
  year: number
  type: ItemType
  imageUrl?: string | null
}

function typeLabel(type: ItemType): string {
  if (type === "SHOW") return "Show"
  if (type === "FILM") return "Film"
  return "Book"
}

export function NewListForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchRows, setSearchRows] = useState<SearchItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const trimmedTitle = useMemo(() => title.trim(), [title])
  const canSubmit = trimmedTitle.length > 0 && !saving

  useEffect(() => {
    if (!modalOpen) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const params = new URLSearchParams()
        const trimmed = query.trim()
        if (trimmed) params.set("q", trimmed)
        if (typeFilter !== "All") params.set("type", typeFilter)
        const res = await fetch(`/api/items${params.toString() ? `?${params.toString()}` : ""}`)
        const data = res.ok ? await res.json() : []
        if (cancelled || !Array.isArray(data)) return
        setSearchRows(
          data.map((row) => ({
            id: row.id,
            title: row.title,
            year: row.year ?? 0,
            type: row.type as ItemType,
            imageUrl: row.imageUrl ?? null,
          })),
        )
      } catch {
        if (!cancelled) setSearchRows([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [modalOpen, query, typeFilter])

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  async function createList() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim(),
          itemIds: Array.from(selectedIds),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const detail = typeof data?.details === "string" ? ` (${data.details})` : ""
        setError(`${data?.error || "Could not create list"}${detail}`)
        return
      }

      const created = await res.json()
      if (!created?.id) {
        setError("Could not create list")
        return
      }

      router.push(`/lists/${created.id}`)
    } catch {
      setError("Could not create list")
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createList()
  }

  const selectedRows = useMemo(
    () => searchRows.filter((row) => selectedIds.has(row.id)),
    [searchRows, selectedIds],
  )

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-zinc-800">Title</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value.slice(0, TITLE_MAX))
            setError(null)
          }}
          placeholder="e.g. Essential Sci-Fi Cinema"
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/5"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-zinc-800">
          Description <span className="text-zinc-400">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
            setError(null)
          }}
          rows={4}
          placeholder="What makes this list special?"
          className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-black/5"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[13px] font-medium text-zinc-800">Items</h2>
            <p className="text-sm text-zinc-500">No items yet</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-55"
          >
            + Add Items
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center">
          <p className="text-base text-zinc-500">Add films, shows, or books to your list</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-5 rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-55"
          >
            + Add Items
          </button>
        </div>
      </section>

      {selectedIds.size > 0 ? (
        <p className="text-sm text-zinc-600">
          {selectedIds.size} {selectedIds.size === 1 ? "item selected" : "items selected"}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={saving}
          className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          {saving ? "Creating..." : "Create"}
        </button>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" aria-hidden onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Add Items</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="5.5" />
                    <path d="m15 15 3.5 3.5" />
                  </svg>
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search films, shows, books..."
                  className="w-full rounded-2xl border border-zinc-200 px-11 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                {typePill.map((t) => {
                  const active = t === typeFilter
                  const label = t === "SHOW" ? "Shows" : t === "FILM" ? "Films" : t === "BOOK" ? "Books" : "All"
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeFilter(t)}
                      className={`rounded-full px-4 py-1.5 ${active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="max-h-[45vh] overflow-y-auto rounded-2xl border border-zinc-100 bg-zinc-50 p-2">
                {searchLoading ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-500">Searching...</p>
                ) : searchRows.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-500">No items found.</p>
                ) : (
                  <ul className="space-y-2">
                    {searchRows.map((row) => {
                      const src = normalizeItemImageUrlForNext(row.imageUrl ?? null)
                      const selected = selectedIds.has(row.id)
                      return (
                        <li key={row.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
                          <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-200">
                            {src ? (
                              <Image
                                src={src}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="44px"
                                unoptimized={src.startsWith("data:") || src.startsWith("blob:")}
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-zinc-900">{row.title}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
                                <MediaTypeIcon type={row.type} className="h-3 w-3" />
                                {typeLabel(row.type)}
                              </span>
                              {row.year ? <span>{row.year}</span> : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSelected(row.id)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-500 hover:bg-zinc-100"}`}
                            aria-label={selected ? "Deselect item" : "Select item"}
                          >
                            {selected ? "✓" : "+"}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={selectedRows.length === 0}
                  className="flex-1 rounded-2xl bg-zinc-900 px-5 py-3 text-base font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                >
                  Add{selectedRows.length > 0 ? ` (${selectedRows.length})` : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}
