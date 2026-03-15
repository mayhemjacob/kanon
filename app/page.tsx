import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { HomePageClient, type HomeReview } from "./HomePageClient";

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
    timeAgo: "2h ago",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
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
    timeAgo: "5h ago",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
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
      return <HomePageClient reviews={[]} initialStatus={{}} />;
    }

    // Logged in: client fetches feed (fast TTFB, no blocking on DB)
    return <HomePageClient />;
  } catch {
    return <HomePageClient reviews={[]} initialStatus={{}} />;
  }
}
