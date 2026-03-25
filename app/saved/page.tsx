import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getUnreadNotificationCount } from "@/lib/notifications";
import SavedPageClient from "./SavedPageClient";

export default async function SavedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const initialUnread = await getUnreadNotificationCount(session.user.id);
  return <SavedPageClient initialUnread={initialUnread} />;
}
