import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { formatTimeAgo } from "@/lib/date";
import { HomePageClient, type HomeReview } from "./HomePageClient";

const offlineCreated1 = new Date(Date.now() - 2 * 60 * 60 * 1000);
const offlineCreated2 = new Date(Date.now() - 5 * 60 * 60 * 1000);

const offlineReviews: HomeReview[] = [
  {
    id: "1",
    itemId: "1",
    userName: "alexchen",
    avatarInitial: "A",
    userImage: null,
    rating: 9.2,
    itemType: "FILM",
    itemImageUrl: null,
    title: "Dune: Part Two",
    tags: ["Sci-Fi", "Adventure", "Drama"],
    body: "Visually stunning. Made me feel small in the best way possible.",
    timeAgo: formatTimeAgo(offlineCreated1),
    createdAt: offlineCreated1,
    year: 2024,
  },
  {
    id: "2",
    itemId: "2",
    userName: "sarahkim",
    avatarInitial: "S",
    userImage: null,
    rating: 9.8,
    itemType: "SHOW",
    itemImageUrl: null,
    title: "The Bear",
    tags: ["Drama", "Comedy", "Contemporary"],
    body: "Intense and beautiful. Every frame felt like controlled chaos.",
    timeAgo: formatTimeAgo(offlineCreated2),
    createdAt: offlineCreated2,
    year: 2023,
  },
];

export default async function Home() {
  const offline = process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

  if (offline) {
    return <HomePageClient reviews={offlineReviews} initialStatus={{}} />;
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      redirect("/login");
    }

    return <HomePageClient />;
  } catch {
    redirect("/login");
  }
}
