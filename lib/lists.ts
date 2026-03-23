import type { ListVisibility, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

type ListWithItemsAndContent = Prisma.ListGetPayload<{
  include: {
    items: {
      orderBy: { position: "asc" }
      include: {
        item: {
          select: {
            id: true
            type: true
            title: true
            year: true
            imageUrl: true
          }
        }
      }
    }
  }
}>

export async function createList(
  ownerId: string,
  input: {
    title: string
    description?: string | null
    visibility?: ListVisibility
    itemIds?: string[]
  },
) {
  const title = input.title?.trim()
  if (!title) throw new Error("List title is required")
  const initialItemIds = Array.from(
    new Set(
      (input.itemIds ?? [])
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean),
    ),
  )

  return prisma.list.create({
    data: {
      ownerId,
      title,
      description: input.description?.trim() || null,
      visibility: input.visibility ?? "PRIVATE",
      items:
        initialItemIds.length > 0
          ? {
              create: initialItemIds.map((itemId, position) => ({
                itemId,
                position,
              })),
            }
          : undefined,
    },
  })
}

export async function getListsForUser(userId: string) {
  return prisma.list.findMany({
    where: { ownerId: userId },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getListById(listId: string, viewerUserId?: string | null) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      owner: {
        select: { id: true, handle: true, name: true, image: true },
      },
      items: {
        orderBy: { position: "asc" },
        include: {
          item: {
            select: {
              id: true,
              type: true,
              title: true,
              year: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  })

  if (!list) return null
  if (list.visibility === "PUBLIC") return list
  if (!viewerUserId || list.ownerId !== viewerUserId) return null
  return list
}

export async function getPublicListById(listId: string) {
  return prisma.list.findFirst({
    where: {
      id: listId,
      visibility: "PUBLIC",
    },
    include: {
      owner: {
        select: { id: true, handle: true, name: true, image: true },
      },
      items: {
        orderBy: { position: "asc" },
        include: {
          item: {
            select: {
              id: true,
              type: true,
              title: true,
              year: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  })
}

async function assertListOwnership(listId: string, ownerId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, ownerId: true },
  })

  if (!list) throw new Error("List not found")
  if (list.ownerId !== ownerId) throw new Error("Forbidden")
  return list
}

export async function updateListBasicFields(
  listId: string,
  ownerId: string,
  updates: {
    title?: string
    description?: string | null
    visibility?: ListVisibility
  },
) {
  await assertListOwnership(listId, ownerId)

  const data: Prisma.ListUpdateInput = {}
  if (updates.title !== undefined) {
    const t = updates.title.trim()
    if (!t) throw new Error("List title is required")
    data.title = t
  }
  if (updates.description !== undefined) {
    data.description = updates.description?.trim() || null
  }
  if (updates.visibility !== undefined) {
    data.visibility = updates.visibility
  }

  return prisma.list.update({
    where: { id: listId },
    data,
  })
}

export async function addListItem(
  listId: string,
  ownerId: string,
  itemId: string,
) {
  await assertListOwnership(listId, ownerId)

  return prisma.$transaction(async (tx) => {
    const maxPositionRow = await tx.listItem.findFirst({
      where: { listId },
      orderBy: { position: "desc" },
      select: { position: true },
    })

    return tx.listItem.create({
      data: {
        listId,
        itemId,
        position: (maxPositionRow?.position ?? -1) + 1,
      },
    })
  })
}

export async function removeListItem(listId: string, ownerId: string, itemId: string) {
  await assertListOwnership(listId, ownerId)

  const existing = await prisma.listItem.findUnique({
    where: {
      listId_itemId: {
        listId,
        itemId,
      },
    },
    select: { id: true, position: true },
  })

  if (!existing) return null

  return prisma.$transaction(async (tx) => {
    await tx.listItem.delete({ where: { id: existing.id } })

    await tx.listItem.updateMany({
      where: { listId, position: { gt: existing.position } },
      data: { position: { decrement: 1 } },
    })

    return { removedItemId: itemId }
  })
}

export async function reorderListItems(
  listId: string,
  ownerId: string,
  orderedItemIds: string[],
): Promise<ListWithItemsAndContent> {
  await assertListOwnership(listId, ownerId)

  const normalized = orderedItemIds.map((id) => id.trim()).filter(Boolean)
  const uniqueOrdered = Array.from(new Set(normalized))

  return prisma.$transaction(async (tx) => {
    const rows = await tx.listItem.findMany({
      where: { listId },
      orderBy: { position: "asc" },
      select: { id: true, itemId: true },
    })

    const currentItemIds = rows.map((r) => r.itemId)
    if (currentItemIds.length !== uniqueOrdered.length) {
      throw new Error("Ordered item ids length mismatch")
    }

    const currentSet = new Set(currentItemIds)
    for (const itemId of uniqueOrdered) {
      if (!currentSet.has(itemId)) {
        throw new Error("Ordered item ids must exactly match current list items")
      }
    }

    for (let i = 0; i < uniqueOrdered.length; i += 1) {
      await tx.listItem.update({
        where: { listId_itemId: { listId, itemId: uniqueOrdered[i] } },
        data: { position: i },
      })
    }

    const updated = await tx.list.findUnique({
      where: { id: listId },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            item: {
              select: {
                id: true,
                type: true,
                title: true,
                year: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    if (!updated) throw new Error("List not found")
    return updated
  })
}
