"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ItemType = "FILM" | "SHOW" | "BOOK"

export default function NewItemPage() {
  const router = useRouter()
  const [type, setType] = useState<ItemType>("FILM")
  const [title, setTitle] = useState("")
  const [year, setYear] = useState<string>("")
  const [status, setStatus] = useState<string>("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("Saving...")

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        year: year ? Number(year) : null,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      setStatus(text || `Error ${res.status}`)
      return
    }

    const created = await res.json()
    router.push(`/items/${created.id}`)
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Add item</h1>
          <a href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back
          </a>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/10"
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
            >
              <option value="FILM">Film</option>
              <option value="SHOW">Show</option>
              <option value="BOOK">Book</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Parasite"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Year (optional)</label>
            <input
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/10"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2019"
              inputMode="numeric"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-900">
              Save
            </button>
            {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
          </div>
        </form>
      </div>
    </main>
  )
}