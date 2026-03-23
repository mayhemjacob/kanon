"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import type { ItemType } from "@/app/components/ItemCard"
import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl"
import { MediaTypeIcon } from "@/app/lists/components/MediaTypeIcon"

type ListItemRow = {
  id: string
  position: number
  item: {
    id: string
    title: string
    year: number | null
    type: ItemType
    imageUrl: string | null
  }
}

type SearchItem = {
  id: string
  title: string
  year: number
  type: ItemType
  imageUrl?: string | null
}

type TypeFilter = "All" | "FILM" | "SHOW" | "BOOK"

const typePill: TypeFilter[] = ["All", "FILM", "SHOW", "BOOK"]

function typeLabel(type: ItemType): string {
  if (type === "SHOW") return "Series"
  if (type === "FILM") return "Film"
  return "Book"
}

export function ListOwnerPageClient({
  listId,
  title,
  description,
  initialItems,
}: {
  listId: string
  title: string
  description: string | null
  initialItems: ListItemRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ListItemRow[]>(initialItems)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchRows, setSearchRows] = useState<SearchItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const existingItemIdSet = useMemo(() => new Set(items.map((row) => row.item.id)), [items])

  function openAddModal() {
    setModalOpen(true)
    setSelectedIds(new Set())
    setAddError(null)
  }

  useEffect(() => {
    if (searchParams?.get("openAdd") !== "1") return
    openAddModal()
    router.replace(`/lists/${listId}`)
    // Intentionally only reacts to one-time query intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, router, searchParams])

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

  async function removeItem(itemId: string) {
    setRemovingItemId(itemId)
    setRemoveError(null)
    try {
      const res = await fetch(`/api/lists/${encodeURIComponent(listId)}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setRemoveError(data?.error || "Could not remove item")
        return
      }

      setItems((prev) =>
        prev
          .filter((row) => row.item.id !== itemId)
          .map((row, index) => ({ ...row, position: index })),
      )
    } catch {
      setRemoveError("Could not remove item")
    } finally {
      setRemovingItemId(null)
    }
  }

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  async function addSelectedItems() {
    if (selectedIds.size === 0) return
    setAddBusy(true)
    setAddError(null)

    const selected = searchRows.filter((row) => selectedIds.has(row.id))
    const addedRows: ListItemRow[] = []

    let hadError = false
    for (const row of selected) {
      if (existingItemIdSet.has(row.id)) continue
      try {
        const res = await fetch(`/api/lists/${encodeURIComponent(listId)}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: row.id }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          if (res.status === 409) {
            continue
          }
          throw new Error(data?.error || "Could not add item")
        }

        addedRows.push({
          id: `tmp-${row.id}`,
          position: items.length + addedRows.length,
          item: {
            id: row.id,
            title: row.title,
            year: row.year || null,
            type: row.type,
            imageUrl: row.imageUrl ?? null,
          },
        })
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Could not add items")
        hadError = true
        break
      }
    }

    if (addedRows.length > 0) {
      setItems((prev) => [...prev, ...addedRows].map((row, index) => ({ ...row, position: index })))
    }

    setAddBusy(false)
    setSelectedIds(new Set())
    if (!hadError) setModalOpen(false)
  }

  const filteredSearchRows = useMemo(
    () => searchRows.filter((row) => !existingItemIdSet.has(row.id)),
    [searchRows, existingItemIdSet],
  )

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 md:pb-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          {description?.trim() ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
          ) : null}
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-800">Items</h2>
              <p className="text-sm text-zinc-500">Manage the order and selection of this list</p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="relative z-10 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 pointer-events-auto"
            >
              + Add Items
            </button>
          </div>

          {removeError ? <p className="text-sm text-red-600">{removeError}</p> : null}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center">
              <p className="text-base text-zinc-500">No items yet</p>
              <button
                type="button"
                onClick={openAddModal}
                className="relative z-10 mt-5 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 pointer-events-auto"
              >
                + Add Items
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((row) => {
                const src = normalizeItemImageUrlForNext(row.item.imageUrl)
                return (
                  <li key={row.item.id} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                    <div className="w-6 text-center text-xs text-zinc-400">{row.position + 1}</div>
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-200">
                      {src ? (
                        <Image
                          src={src}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="36px"
                          unoptimized={src.startsWith("data:") || src.startsWith("blob:")}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-900">{row.item.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
                          <MediaTypeIcon type={row.item.type} className="h-3 w-3" />
                          {typeLabel(row.item.type)}
                        </span>
                        {row.item.year ? <span>{row.item.year}</span> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeItem(row.item.id)}
                      disabled={removingItemId === row.item.id}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
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
                  onChange={(e) => {
                    setQuery(e.target.value)
                  }}
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
                ) : filteredSearchRows.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-500">No items found.</p>
                ) : (
                  <ul className="space-y-2">
                    {filteredSearchRows.map((row) => {
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

              {addError ? <p className="text-sm text-red-600">{addError}</p> : null}

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
                  onClick={() => void addSelectedItems()}
                  disabled={selectedIds.size === 0 || addBusy}
                  className="flex-1 rounded-2xl bg-zinc-900 px-5 py-3 text-base font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                >
                  {addBusy ? "Adding..." : `Add${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
