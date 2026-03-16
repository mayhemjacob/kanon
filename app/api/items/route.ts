import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  const items = await prisma.item.findMany({
    where: q
      ? {
          title: { contains: q, mode: "insensitive" },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: q ? 20 : 100,
    include: { reviews: true },
  })

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