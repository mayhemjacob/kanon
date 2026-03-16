import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getHomeFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ reviews: [], initialStatus: {} }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  }
  const feed = await getHomeFeed(session.user.id);
  return new Response(JSON.stringify(feed), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
    },
  });
}
