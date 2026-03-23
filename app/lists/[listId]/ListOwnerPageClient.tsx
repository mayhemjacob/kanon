"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
    director: string | null
  }
}

type SearchItem = {
  id: string
  title: string
  year: number
  type: ItemType
  imageUrl?: string | null
}

type AddedListItemResponse = {
  id: string
  listId: string
  itemId: string
  position: number
  item: {
    id: string
    title: string
    year: number | null
    type: ItemType
    imageUrl: string | null
    director: string | null
  }
}

type TypeFilter = "All" | "FILM" | "SHOW" | "BOOK"

const typePill: TypeFilter[] = ["All", "FILM", "SHOW", "BOOK"]

function typeLabel(type: ItemType): string {
  if (type === "SHOW") return "Series"
  if (type === "FILM") return "Film"
  return "Book"
}

function typeLabelLower(type: ItemType): string {
  return typeLabel(type).toLowerCase()
}

function cloneListRows(rows: ListItemRow[]): ListItemRow[] {
  return rows.map((r) => ({
    ...r,
    item: { ...r.item },
  }))
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  )
}

function creditLine(type: ItemType, director: string | null): string | null {
  const d = director?.trim()
  if (!d) return null
  if (type === "BOOK") return `By ${d}`
  return `Dir. ${d}`
}

export function ListOwnerPageClient({
  listId,
  title: initialTitle,
  description: initialDescription,
  curator,
  initialItems,
}: {
  listId: string
  title: string
  description: string | null
  curator: { image: string | null; handle: string | null; name: string | null }
  initialItems: ListItemRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ListItemRow[]>(initialItems)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const [listTitle, setListTitle] = useState(initialTitle)
  const [listDescription, setListDescription] = useState(initialDescription ?? "")
  const [editing, setEditing] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [shareTip, setShareTip] = useState<string | null>(null)

  const editSnapshot = useRef({
    title: initialTitle,
    description: initialDescription ?? "",
    items: cloneListRows(initialItems),
  })

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchRows, setSearchRows] = useState<SearchItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const existingItemIdSet = useMemo(() => new Set(items.map((row) => row.item.id)), [items])

  const curatorLabel = curator.handle
    ? `@${curator.handle}`
    : curator.name?.trim() || "Member"

  const avatarSrc = normalizeItemImageUrlForNext(curator.image)

  const openAddModal = useCallback(() => {
    setModalOpen(true)
    setSelectedIds(new Set())
    setAddError(null)
  }, [])

  useEffect(() => {
    if (searchParams?.get("openAdd") !== "1") return
    openAddModal()
    router.replace(`/lists/${listId}`)
  }, [listId, router, searchParams, openAddModal])

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
          data.map((row: { id: string; title: string; year?: number | null; type: string; imageUrl?: string | null }) => ({
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

  function startEditing() {
    editSnapshot.current = {
      title: listTitle,
      description: listDescription,
      items: cloneListRows(items),
    }
    setEditError(null)
    setEditing(true)
  }

  function cancelEditing() {
    setListTitle(editSnapshot.current.title)
    setListDescription(editSnapshot.current.description)
    setItems(cloneListRows(editSnapshot.current.items))
    setEditing(false)
    setEditError(null)
    setDraggingItemId(null)
  }

  function reorderItemsLocal(dragItemId: string, targetItemId: string) {
    if (dragItemId === targetItemId) return
    setItems((prev) => {
      const from = prev.findIndex((r) => r.item.id === dragItemId)
      const to = prev.findIndex((r) => r.item.id === targetItemId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [removed] = next.splice(from, 1)
      next.splice(to, 0, removed)
      return next.map((row, index) => ({ ...row, position: index }))
    })
  }

  async function saveListMeta() {
    const t = listTitle.trim()
    if (!t) {
      setEditError("Title is required")
      return
    }
    setSaveBusy(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/lists/${encodeURIComponent(listId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: listDescription.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setEditError(data?.error || "Could not save")
        return
      }
      const data = await res.json()
      setListTitle(data.title ?? t)
      setListDescription(data.description ?? "")

      const orderedItemIds = items.map((r) => r.item.id)
      const reorderRes = await fetch(`/api/lists/${encodeURIComponent(listId)}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItemIds }),
      })
      if (!reorderRes.ok) {
        const reorderData = await reorderRes.json().catch(() => null)
        setEditError(reorderData?.error || "List saved, but order could not be updated")
        return
      }
      const reorderPayload = await reorderRes.json()
      const nextItems: ListItemRow[] = Array.isArray(reorderPayload?.items)
        ? reorderPayload.items.map(
            (row: {
              id: string
              position: number
              item: ListItemRow["item"]
            }) => ({
              id: row.id,
              position: row.position,
              item: { ...row.item },
            }),
          )
        : items

      setItems(nextItems)
      editSnapshot.current = {
        title: data.title ?? t,
        description: data.description ?? "",
        items: cloneListRows(nextItems),
      }
      setEditing(false)
      setDraggingItemId(null)
    } catch {
      setEditError("Could not save")
    } finally {
      setSaveBusy(false)
    }
  }

  async function deleteList() {
    if (!window.confirm("Delete this list? This cannot be undone.")) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/lists/${encodeURIComponent(listId)}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.error || "Could not delete list")
        return
      }
      router.push("/profile")
    } catch {
      alert("Could not delete list")
    } finally {
      setDeleteBusy(false)
    }
  }

  async function shareList() {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}/l/${listId}`

    try {
      if (navigator.share) {
        await navigator.share({ title: listTitle, url })
        return
      }
    } catch {
      // user cancelled share sheet
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setShareTip("Link copied")
      setTimeout(() => setShareTip(null), 2000)
    } catch {
      setShareTip("Could not copy link")
      setTimeout(() => setShareTip(null), 2000)
    }
  }

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

        const created = (await res.json().catch(() => null)) as AddedListItemResponse | null
        if (!created?.id || !created?.item?.id) {
          throw new Error("Could not add item")
        }

        addedRows.push({
          id: created.id,
          position: created.position,
          item: {
            id: created.item.id,
            title: created.item.title,
            year: created.item.year ?? null,
            type: created.item.type,
            imageUrl: created.item.imageUrl ?? null,
            director: created.item.director ?? null,
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
    <main className="min-h-screen bg-white pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => void deleteList()}
              disabled={deleteBusy}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-40"
              aria-label="Delete list"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={editing ? cancelEditing : startEditing}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              {editing ? "Cancel" : "Edit"}
            </button>
            <button
              type="button"
              onClick={() => void shareList()}
              className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 sm:pt-8">
        {shareTip ? (
          <p className="mb-3 text-center text-xs text-zinc-500" role="status">
            {shareTip}
          </p>
        ) : null}

        {editing ? (
          <div className="mb-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <input
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-lg font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-black/5"
              placeholder="List title"
            />
            <textarea
              value={listDescription}
              onChange={(e) => setListDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-black/5"
              placeholder="Description (optional)"
            />
            {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void saveListMeta()}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                {saveBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{listTitle}</h1>
            {listDescription.trim() ? (
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">{listDescription}</p>
            ) : null}
          </>
        )}

        {/* Curator */}
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
            {curator.handle ? (
              <Link
                href={`/profile/${curator.handle}`}
                className="font-semibold text-zinc-900 hover:underline"
              >
                {curatorLabel}
              </Link>
            ) : (
              <p className="font-semibold text-zinc-900">{curatorLabel}</p>
            )}
          </div>
        </div>

        <hr className="my-6 border-zinc-200" />

        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>
            <p className="text-sm text-zinc-500">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <span className="text-base leading-none" aria-hidden>
              +
            </span>
            Add Items
          </button>
        </div>

        {removeError ? <p className="mt-3 text-sm text-red-600">{removeError}</p> : null}

        <ul className="mt-4 space-y-4">
          {items.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500">
              <p>No items yet.</p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <span className="text-base leading-none" aria-hidden>
                  +
                </span>
                Add Items
              </button>
            </li>
          ) : editing ? (
            <>
              {items.map((row, index) => {
                const src = normalizeItemImageUrlForNext(row.item.imageUrl)
                const y = row.item.year
                const meta =
                  y != null && y > 0
                    ? `${y} • ${typeLabelLower(row.item.type)}`
                    : typeLabelLower(row.item.type)
                return (
                  <li
                    key={row.item.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingItemId(row.item.id)
                      e.dataTransfer.effectAllowed = "move"
                      e.dataTransfer.setData("text/plain", row.item.id)
                    }}
                    onDragEnd={() => setDraggingItemId(null)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const fromId = e.dataTransfer.getData("text/plain") || draggingItemId
                      if (fromId) reorderItemsLocal(fromId, row.item.id)
                      setDraggingItemId(null)
                    }}
                    className={`flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-3 sm:gap-4 ${
                      draggingItemId === row.item.id ? "opacity-60" : ""
                    }`}
                  >
                    <div
                      className="flex shrink-0 cursor-grab touch-none items-center gap-2 text-zinc-400 active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <DragHandleIcon className="h-5 w-3" />
                      <span className="w-5 text-center text-sm font-medium tabular-nums text-zinc-500">
                        {index + 1}
                      </span>
                    </div>
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-200 sm:h-[4.5rem] sm:w-12">
                      {src ? (
                        <Image
                          src={src}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={src.startsWith("data:") || src.startsWith("blob:")}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{row.item.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{meta}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeItem(row.item.id)}
                      disabled={removingItemId === row.item.id}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 disabled:opacity-40"
                      aria-label={`Remove ${row.item.title}`}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                )
              })}
            </>
          ) : (
            items.map((row) => {
              const src = normalizeItemImageUrlForNext(row.item.imageUrl)
              const credit = creditLine(row.item.type, row.item.director)
              return (
                <li
                  key={row.item.id}
                  className="relative overflow-hidden rounded-2xl bg-zinc-50 p-4 pl-[4.25rem] sm:pl-[4.5rem]"
                >
                  <span
                    className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-5xl font-semibold tabular-nums leading-none text-zinc-200 sm:text-6xl sm:text-[3.5rem]"
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
                          <MediaTypeIcon type={row.item.type} className="h-3.5 w-3.5 text-zinc-500" />
                          {typeLabel(row.item.type)}
                        </span>
                        {row.item.year ? (
                          <span className="text-sm text-zinc-500">{row.item.year}</span>
                        ) : null}
                      </div>
                      {credit ? <p className="mt-2 text-sm text-zinc-500">{credit}</p> : null}
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void removeItem(row.item.id)}
                          disabled={removingItemId === row.item.id}
                          className="text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })
          )}
        </ul>
        {editing && items.length > 0 ? (
          <p className="mt-2 text-center text-xs text-zinc-500">Drag items to reorder</p>
        ) : null}
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
