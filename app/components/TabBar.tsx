"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const tabs = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Discover" },
  { href: "/add", label: "Add" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
];

function TabIcon({ label, active }: { label: string; active: boolean }) {
  const base = "h-[24px] w-[24px]";

  switch (label) {
    case "Home":
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 11.5 12 4l7.5 7.5" />
          <path d="M6.5 10.5V19h4v-4.5h3V19h4v-8.5" />
        </svg>
      );
    case "Discover":
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15 15 3.5 3.5" />
        </svg>
      );
    case "Add":
      return (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      );
    case "Saved":
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
        </svg>
      );
    case "Profile":
    default:
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="9" r="3.2" />
          <path d="M6.5 19.5c1.2-2.1 3.1-3.3 5.5-3.3s4.3 1.2 5.5 3.3" />
        </svg>
      );
  }
}

export function TabBar() {
  const pathname = usePathname() || "/";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-6 pt-2 pb-4">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 items-center justify-center text-xs ${
                active
                  ? "text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
            >
              <TabIcon label={tab.label} active={active} />
              <span className="sr-only">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

