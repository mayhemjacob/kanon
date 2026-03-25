import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getUnreadNotificationCount } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ unread: 0 });
  }

  const unread = await getUnreadNotificationCount(session.user.id);
  return NextResponse.json({ unread });
}

