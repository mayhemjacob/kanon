import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  const user = session?.user;
  if (!user?.id && !user?.email) {
    redirect("/login");
  }

  const where = user.id
    ? { id: user.id }
    : user.email
      ? { email: user.email }
      : null;

  if (!where) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where,
    select: { handle: true },
  });

  // User already has a handle — skip onboarding, go to Discover
  if (dbUser?.handle?.trim()) {
    redirect("/search");
  }

  return <OnboardingForm />;
}
