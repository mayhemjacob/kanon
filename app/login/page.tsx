"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const offline =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_OFFLINE_DEV === "1";

function safePostLoginPath(): string {
  if (typeof window === "undefined") return "/onboarding";
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/onboarding";
}

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-zinc-600">
              {offline
                ? "Dev mode: skip Google sign-in."
                : "Continue with your Google account."}
            </p>
          </div>

          {!offline && (
            <button
              onClick={() =>
                signIn("google", { callbackUrl: safePostLoginPath() })
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium hover:bg-zinc-50"
            >
              <span>Continue with Google</span>
            </button>
          )}

          {offline && (
            <button
              onClick={() => router.push(safePostLoginPath())}
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-zinc-900"
            >
              Skip login (dev only)
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

