"use client";

import { useEffect, useRef } from "react";
import type { ReviewRatingReactionType } from "@prisma/client";

type ReviewRatingReactionPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ReviewRatingReactionType) => void;
  currentUserReaction: ReviewRatingReactionType | null;
};

const OPTIONS: {
  type: ReviewRatingReactionType;
  label: string;
  icon: "up" | "check" | "down";
}[] = [
  { type: "TOO_LOW", label: "Too low", icon: "up" },
  { type: "ABOUT_RIGHT", label: "About right", icon: "check" },
  { type: "TOO_HIGH", label: "Too high", icon: "down" },
];

function Icon({ kind }: { kind: "up" | "check" | "down" }) {
  if (kind === "up") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    );
  }
  if (kind === "check") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

export function ReviewRatingReactionPicker({
  open,
  onClose,
  onSelect,
  currentUserReaction,
}: ReviewRatingReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      onClose();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    queueMicrotask(() => firstBtnRef.current?.focus());

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),14rem)] rounded-xl border border-zinc-100 bg-white p-3 shadow-lg"
      role="menu"
      aria-label="Rating reactions"
    >
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt, i) => {
          const selected = currentUserReaction === opt.type;
          return (
            <button
              key={opt.type}
              ref={i === 0 ? firstBtnRef : undefined}
              type="button"
              role="menuitem"
              aria-label={opt.label}
              onClick={() => onSelect(opt.type)}
              className={`flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                selected
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Icon kind={opt.icon} />
              <span className="text-[10px] font-semibold uppercase tracking-wide leading-tight">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
