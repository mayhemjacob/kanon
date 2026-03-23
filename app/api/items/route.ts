import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

const SEARCH_LIMIT = 50

type ItemWithReviews = Prisma.ItemGetPayload<{ include: { reviews: true } }>

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  const typeParam = searchParams.get("type")?.trim().toUpperCase()
  const typeFilter =
    typeParam === "FILM" || typeParam === "SHOW" || typeParam === "BOOK"
      ? typeParam
      : null

  let items: ItemWithReviews[]

  if (q) {
    const pattern = `%${q}%`
    const typeSql = typeFilter
      ? Prisma.sql`AND "type" = ${typeFilter}::"ItemType"`
      : Prisma.empty

    const idRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Item"
      WHERE (
        "title" ILIKE ${pattern}
        OR ("originalTitle" IS NOT NULL AND "originalTitle" ILIKE ${pattern})
        OR EXISTS (
          SELECT 1 FROM unnest("tags") AS t(tag) WHERE tag ILIKE ${pattern}
        )
      )
      ${typeSql}
      ORDER BY "createdAt" DESC
      LIMIT ${SEARCH_LIMIT}
    `

    const ids = idRows.map((r) => r.id)
    if (ids.length === 0) {
      items = []
    } else {
      const unordered = await prisma.item.findMany({
        where: { id: { in: ids } },
        include: { reviews: true },
      })
      const byId = new Map(unordered.map((row) => [row.id, row]))
      items = ids.map((id) => byId.get(id)).filter(Boolean) as typeof unordered
    }
  } else {
    items = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { reviews: true },
    })
  }

  const withRating = items.map((item) => {
    const ratingCount = item.reviews.length
    const averageRating =
      ratingCount === 0
        ? 0
        : Number(
            (item.reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(1)
          )
    return {
      id: item.id,
      title: item.title,
      year: item.year ?? 0,
      type: item.type,
      imageUrl: item.imageUrl,
      averageRating,
      ratingCount,
      tags: item.tags ?? [],
    }
  })

  return NextResponse.json(withRating)
}

export async function POST(req: Request) {
  const body = await req.json()

  if (!body.title || !body.type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const item = await prisma.item.create({
    data: {
      type: body.type,
      title: body.title,
      year: body.year ?? null,
      imageUrl: body.imageUrl ?? null,
      director: body.director?.trim() || null,
      description: body.description?.trim() || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
    },
  })

  return NextResponse.json(item)
}