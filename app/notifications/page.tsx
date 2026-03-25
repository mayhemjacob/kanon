import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getNotificationsForUser } from "@/lib/notifications";
import { NotificationsPageClient } from "./NotificationsPageClient";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const items = await getNotificationsForUser(session.user.id, { limit: 60 });
  return <NotificationsPageClient initialItems={items} />;
}

