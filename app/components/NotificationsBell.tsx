"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function NotificationsBell({
  initialUnread = 0,
  className = "",
}: {
  initialUnread?: number;
  className?: string;
}) {
  const [unread, setUnread] = useState(initialUnread);
  const busyRef = useRef(false);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    const refresh = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (data && typeof data.unread === "number") setUnread(data.unread);
      } catch {
        // ignore
      } finally {
        busyRef.current = false;
      }
    };

    void refresh();
    const onFocus = () => void refresh();
    const onPageShow = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className={`relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 ${className}`}
      aria-label="Notifications"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {unread > 0 ? (
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-900 ring-2 ring-white" />
      ) : null}
    </Link>
  );
}

