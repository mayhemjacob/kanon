import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Canonical URL for a review is /items/[itemId]/reviews/[reviewId]
 * so the route reflects both the item (what was reviewed) and the review id.
 * This page redirects /reviews/[id] → /items/[itemId]/reviews/[id].
 */
export default async function ReviewIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reviewId } = await params;

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { itemId: true },
    });
    if (review) {
      redirect(`/items/${review.itemId}/reviews/${reviewId}`);
    }
  } catch {
    // Offline or DB error: redirect to a known offline review URL if this is the mock id
    if (reviewId === "offline-review") {
      redirect("/items/1/reviews/offline-review");
    }
  }

  redirect("/");
}
