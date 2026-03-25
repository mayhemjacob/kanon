import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { markNotificationRead } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const notificationId = id?.trim();
  if (!notificationId) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }

  const res = await markNotificationRead({
    userId: session.user.id,
    notificationId,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: res.reason === "not_found" ? "Not found" : "Forbidden" },
      { status: res.reason === "not_found" ? 404 : 403 }
    );
  }

  return NextResponse.json({ ok: true });
}

