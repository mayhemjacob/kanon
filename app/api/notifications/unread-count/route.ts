import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getUnreadNotificationCount } from "@/lib/notifications";

function isTransientPoolSaturation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /MaxClientsInSessionMode: max clients reached/i.test(msg) ||
    /Unable to check out connection from the pool due to timeout/i.test(msg) ||
    /Timed out fetching a new connection from the connection pool/i.test(msg) ||
    /P2024/i.test(msg)
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ unread: 0 });
    }

    const unread = await getUnreadNotificationCount(session.user.id);
    return NextResponse.json({ unread });
  } catch (err) {
    if (isTransientPoolSaturation(err)) {
      return NextResponse.json({ unread: 0 });
    }
    throw err;
  }
}

