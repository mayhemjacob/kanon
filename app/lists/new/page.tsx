import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/pages/api/auth/[...nextauth]"

import { NewListForm } from "./NewListForm"

export default async function NewListPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Create List</h1>
        </header>

        <NewListForm />
      </div>
    </main>
  )
}
