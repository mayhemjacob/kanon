import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { computeTasteClash, normalizeClashHandle } from "@/lib/tasteClash";
import type { TasteClashUserSnapshot } from "@/lib/tasteClash";
import { prisma } from "@/lib/prisma";

function imageNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function Avatar({
  handle,
  imageUrl,
}: {
  handle: string;
  imageUrl: string | null;
}) {
  const initial = handle.charAt(0).toUpperCase() || "?";
  return (
    <div className="relative z-[1] h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-zinc-200 shadow-sm sm:h-16 sm:w-16">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
          sizes="64px"
          unoptimized={imageNeedsUnoptimized(imageUrl)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-base font-semibold text-zinc-600 sm:text-lg">
          {initial}
        </div>
      )}
    </div>
  );
}

function toSnapshot(
  row: {
    id: string;
    handle: string | null;
    image: string | null;
    reviews: {
      rating: number;
      item: {
        id: string;
        title: string;
        type: string;
        tags: string[];
      };
    }[];
  },
  handleFallback: string,
): TasteClashUserSnapshot {
  return {
    id: row.id,
    handle: row.handle ?? handleFallback,
    image: row.image,
    reviews: row.reviews.map((r) => ({
      rating: r.rating,
      item: {
        id: r.item.id,
        title: r.item.title,
        type: r.item.type,
        tags: r.item.tags ?? [],
      },
    })),
  };
}

export default async function TasteClashPublicPage({
  params,
}: {
  params: Promise<{ handleA: string; handleB: string }>;
}) {
  const { handleA: rawA, handleB: rawB } = await params;
  const a = normalizeClashHandle(rawA);
  const b = normalizeClashHandle(rawB);

  if (!a || !b || a === b) {
    notFound();
  }

  const [rowA, rowB] = await Promise.all([
    prisma.user.findUnique({
      where: { handle: a },
      select: {
        id: true,
        handle: true,
        image: true,
        reviews: {
          select: {
            rating: true,
            item: {
              select: { id: true, title: true, type: true, tags: true },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { handle: b },
      select: {
        id: true,
        handle: true,
        image: true,
        reviews: {
          select: {
            rating: true,
            item: {
              select: { id: true, title: true, type: true, tags: true },
            },
          },
        },
      },
    }),
  ]);

  if (!rowA || !rowB) {
    notFound();
  }

  const clash = computeTasteClash(
    toSnapshot(rowA, a),
    toSnapshot(rowB, b),
  );
  const pct = clash.compatibilityScore;
  const handleA = rowA.handle ?? a;
  const handleB = rowB.handle ?? b;
  const clashLineText = clash.biggestClash
    ? `Your biggest clash is ${clash.biggestClash.title}`
    : null;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-12 pt-8 sm:px-8 sm:pt-10 md:max-w-xl">
        <header className="mb-8 flex shrink-0 items-center justify-between gap-4 border-b border-zinc-100 pb-6 sm:mb-10">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-zinc-700"
          >
            Kanon
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 sm:h-10 sm:px-5 sm:text-[15px]"
          >
            Join Kanon
          </Link>
        </header>

        <article className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="relative mb-8 flex items-center justify-between gap-2 sm:mb-10">
            <div
              className="pointer-events-none absolute left-[14%] right-[14%] top-1/2 z-0 h-px -translate-y-1/2 bg-zinc-200 sm:left-[18%] sm:right-[18%]"
              aria-hidden
            />
            <div className="relative z-[1] flex flex-1 flex-col items-center gap-2">
              <Avatar handle={handleA} imageUrl={rowA.image} />
              <span className="max-w-[7rem] truncate text-center text-sm font-medium text-zinc-900">
                @{handleA}
              </span>
            </div>
            <div className="relative z-[1] flex flex-1 flex-col items-center gap-2">
              <Avatar handle={handleB} imageUrl={rowB.image} />
              <span className="max-w-[7rem] truncate text-center text-sm font-medium text-zinc-900">
                @{handleB}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-5xl font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-6xl">
              {pct}%
            </p>
            <p className="mx-auto mt-4 max-w-sm text-pretty text-[15px] leading-relaxed text-zinc-600 sm:text-base">
              <span className="font-semibold text-zinc-900">@{handleA}</span>{" "}
              and{" "}
              <span className="font-semibold text-zinc-900">@{handleB}</span>{" "}
              have{" "}
              <span className="font-semibold text-zinc-900">{pct}%</span>{" "}
              cultural compatibility
            </p>
          </div>

          <hr className="my-8 border-zinc-100 sm:my-10" />

          <ul className="space-y-3 text-[15px] leading-relaxed text-zinc-700 sm:text-base">
            {clash.insightLines.map((line, i) => (
              <li
                key={i}
                className={`flex gap-2 ${
                  clashLineText && line === clashLineText
                    ? "font-semibold text-zinc-900"
                    : ""
                }`}
              >
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {clash.nudge ? (
            <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500 sm:text-sm">
              {clash.nudge}
            </p>
          ) : null}
        </article>

        <aside className="mt-10 text-center sm:mt-12">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            Discover your cultural compatibility
          </h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-zinc-600 sm:text-[15px]">
            Join Kanon to compare taste with friends and explore new
            perspectives.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-800 sm:h-12 sm:text-[15px]"
          >
            Join Kanon
          </Link>
        </aside>

        <footer className="mt-auto flex flex-col gap-4 border-t border-zinc-100 pt-10 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:pt-12">
          <p>
            © {new Date().getFullYear()} Kanon. A space for cultural taste.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1">
            <a href="#" className="hover:text-zinc-800">
              About
            </a>
            <a href="#" className="hover:text-zinc-800">
              Privacy
            </a>
            <a href="#" className="hover:text-zinc-800">
              Terms
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
