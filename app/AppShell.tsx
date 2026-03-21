"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabBar, tabs } from "./components/TabBar";

function isOtherUserProfile(pathname: string): boolean {
  if (!pathname.startsWith("/profile/") || pathname === "/profile") {
    return false;
  }
  // Show tab bar on followers/following so users can always navigate
  if (pathname.endsWith("/followers") || pathname.endsWith("/following")) {
    return false;
  }
  return true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  const hideNav =
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/match/");

  const publicShareChrome =
    pathname.startsWith("/r/") || pathname.startsWith("/match/");

  const otherUserProfile = isOtherUserProfile(pathname);

  const isActive = (href: string) => {
    if (href === "/profile") return pathname === "/profile";
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  };

  return (
    <div
      className={`min-h-screen md:h-dvh md:max-h-dvh md:overflow-hidden ${
        publicShareChrome ? "bg-white" : "bg-zinc-50"
      }`}
    >
      <div className="mx-auto flex max-w-5xl md:h-full md:min-h-0 md:px-6">
        {!hideNav && (
          <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 md:flex md:flex-col md:gap-6">
            <div className="text-lg font-semibold tracking-tight">Kanon</div>
            <nav className="space-y-1 text-sm">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                    isActive(tab.href)
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <span>{tab.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        )}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col md:h-full md:min-h-0">
          <div className="flex-1 md:min-h-0 md:overflow-y-auto">{children}</div>
          {!hideNav && !otherUserProfile && <TabBar />}
        </div>
      </div>
    </div>
  );
}

