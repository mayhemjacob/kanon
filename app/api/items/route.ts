import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(items)
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
    },
  })

  return NextResponse.json(item)
}