import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  loadPublicMatch,
  ogPersonLabel,
} from "@/lib/tasteMatch/loadPublicMatch";

import { MatchShareActions } from "./MatchShareActions";

function imageNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function MatchAvatar({
  handle,
  imageUrl,
}: {
  handle: string;
  imageUrl: string | null;
}) {
  const initial = handle.charAt(0).toUpperCase() || "?";
  const sizePx = 80;
  return (
    <div className="relative z-[2] h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-zinc-200 shadow-sm ring-1 ring-zinc-100 sm:h-20 sm:w-20">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={sizePx}
          height={sizePx}
          className="h-full w-full object-cover"
          sizes="80px"
          unoptimized={imageNeedsUnoptimized(imageUrl)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-600 sm:text-xl">
          {initial}
        </div>
      )}
    </div>
  );
}

type PageParams = { handleA: string; handleB: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { handleA: rawA, handleB: rawB } = await params;
  const data = await loadPublicMatch(rawA, rawB);

  if (!data) {
    return {
      title: "Taste Match · Kanon",
      description:
        "Compare cultural compatibility and taste overlap with friends on Kanon.",
    };
  }

  const { rowA, rowB, handleA, handleB, tasteMatch } = data;
  const pct = tasteMatch.compatibilityScore;
  const titleA = ogPersonLabel(rowA, handleA);
  const titleB = ogPersonLabel(rowB, handleB);
  const title = `${titleA} & ${titleB} · Taste Match · Kanon`;
  const description = `${titleA} and ${titleB}: ${pct}% cultural compatibility on Kanon. Compare taste in films, series, and books.`;
  const ogImagePath = `/match/${encodeURIComponent(rawA)}/${encodeURIComponent(rawB)}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title: `${titleA} & ${titleB} · Taste Match`,
      description: `${pct}% cultural compatibility`,
      type: "website",
      images: [
        {
          url: ogImagePath,
          width: 1200,
          height: 630,
          alt: `${titleA} and ${titleB} · ${pct}% · Taste Match`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${titleA} & ${titleB} · Taste Match`,
      description: `${pct}% cultural compatibility on Kanon`,
      images: [ogImagePath],
    },
  };
}

export default async function TasteMatchPublicPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { handleA: rawA, handleB: rawB } = await params;
  const data = await loadPublicMatch(rawA, rawB);

  if (!data) {
    notFound();
  }

  const { rowA, rowB, handleA, handleB, tasteMatch } = data;
  const pct = tasteMatch.compatibilityScore;
  const differenceHighlightLine = tasteMatch.biggestDifference
    ? `You disagree most on ${tasteMatch.biggestDifference.title}`
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
          <div className="relative mb-8 flex items-start justify-between gap-2 sm:mb-10">
            <div
              className="pointer-events-none absolute left-[14%] right-[14%] top-8 z-0 h-px -translate-y-1/2 bg-zinc-200 sm:left-[18%] sm:right-[18%] sm:top-10"
              aria-hidden
            />
            <div className="relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-2.5">
              <MatchAvatar handle={handleA} imageUrl={rowA.image} />
              <span className="max-w-full truncate px-1 text-center text-sm font-bold text-zinc-900 sm:text-[15px]">
                @{handleA}
              </span>
            </div>
            <div className="relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-2.5">
              <MatchAvatar handle={handleB} imageUrl={rowB.image} />
              <span className="max-w-full truncate px-1 text-center text-sm font-bold text-zinc-900 sm:text-[15px]">
                @{handleB}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-5xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-6xl">
              {pct}%
            </p>
            <p className="mt-2.5 text-sm font-normal lowercase tracking-wide text-zinc-500 sm:mt-3 sm:text-[15px]">
              cultural compatibility
            </p>
            <span className="sr-only">
              @{handleA} and @{handleB} have {pct}% cultural compatibility.
            </span>
          </div>

          <hr className="my-8 border-zinc-100 sm:my-10" />

          <ul className="space-y-3 text-[15px] leading-relaxed text-zinc-700 sm:text-base">
            {tasteMatch.insightLines.map((line, i) => (
              <li
                key={i}
                className={`flex gap-2 ${
                  differenceHighlightLine && line === differenceHighlightLine
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

          {tasteMatch.nudge ? (
            <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500 sm:text-sm">
              {tasteMatch.nudge}
            </p>
          ) : null}

          <MatchShareActions
            handleA={handleA}
            handleB={handleB}
            compatibilityScore={pct}
          />
        </article>

        <aside className="mt-10 pb-10 text-center sm:mt-12 sm:pb-12">
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

        <footer className="flex flex-col gap-4 border-t border-zinc-100 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:pt-7">
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
