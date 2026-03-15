import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReviewPageForm } from "./ReviewPageForm";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

  if (offline) {
    return (
      <ReviewPageForm
        item={{
          id,
          title: "Dune: Part Two",
          year: 2024,
          tags: ["Sci-Fi", "Adventure"],
          imageUrl: null,
        }}
      />
    );
  }

  const item = await prisma.item.findUnique({
    where: { id },
  });

  if (!item) {
    return notFound();
  }

  return (
    <ReviewPageForm
      item={{
        id: item.id,
        title: item.title,
        year: item.year ?? null,
        tags: [], // add tags to schema later if needed
        imageUrl: item.imageUrl ?? null,
      }}
    />
  );
}
