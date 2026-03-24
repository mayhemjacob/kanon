import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { normalizeItemImageUrlForNext } from "@/lib/normalizeItemImageUrl";
import {
  listCuratorLabel,
  loadPublicListShare,
} from "@/lib/publicList/loadPublicListShare";

type PageParams = { listId: string };

function clipMeta(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function publicListDescription(description: string | null, title: string): string {
  const clean = description?.replace(/\s+/g, " ").trim();
  if (clean) return clipMeta(clean, 180);
  return clipMeta(`A curated list on Kanon: ${title}`, 180);
}

function imageNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function createdDateLabel(createdAt: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(createdAt);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { listId } = await params;
  const token = listId?.trim() ?? "";
  const list = await loadPublicListShare(token);

  if (!list) {
    return {
      title: "List · Kanon",
      description: "A curated list on Kanon",
    };
  }

  const curator = listCuratorLabel(list.owner.handle, list.owner.name);
  const title = clipMeta(`${list.title} · ${curator} · Kanon`, 72);
  const description = publicListDescription(list.description ?? null, list.title);
  const ogImagePath = `/l/${encodeURIComponent(token)}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title: clipMeta(`${list.title} · List`, 64),
      description: clipMeta(`${list.items.length} recommendations by ${curator}`, 200),
      type: "website",
      images: [
        {
          url: ogImagePath,
          width: 1200,
          height: 630,
          alt: clipMeta(`${list.title} by ${curator}`, 120),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: clipMeta(`${list.title} · List`, 64),
      description,
      images: [ogImagePath],
    },
  };
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { listId } = await params;
  const token = listId?.trim();
  if (!token) notFound();

  const list = await loadPublicListShare(token);
  if (!list) notFound();

  const curator = listCuratorLabel(list.owner.handle, list.owner.name);
  const avatarSrc = normalizeItemImageUrlForNext(list.owner.image ?? null);
  const profileHref = list.owner.handle ? `/profile/${list.owner.handle}` : "/";
  const description = list.description?.trim();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 pb-16 pt-8 sm:px-8 sm:pt-10 md:max-w-3xl md:pb-20">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-zinc-100 pb-6 sm:mb-10">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-zinc-700"
          >
            Kanon
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 sm:h-11 sm:px-6 sm:text-[15px]"
          >
            Join Kanon
          </Link>
        </header>

        <section className="mb-7 flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-200">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt=""
                fill
                className="object-cover"
                sizes="44px"
                unoptimized={imageNeedsUnoptimized(avatarSrc)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-600">
                {curator.replace(/^@/, "").charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">{curator}</p>
            <p className="text-xs text-zinc-500">curated a list</p>
          </div>
        </section>

        <section className="mb-7">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            {list.title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-600">
              {description}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-zinc-500">
            {list.items.length} {list.items.length === 1 ? "recommendation" : "recommendations"}
          </p>
        </section>

        <hr className="mb-5 border-zinc-100" />

        <ol className="space-y-4">
          {list.items.map((row) => {
            const src = normalizeItemImageUrlForNext(row.item.imageUrl);
            return (
              <li key={row.id} className="relative pl-11 sm:pl-12">
                <span
                  className="absolute left-0 top-1 text-4xl font-semibold tabular-nums leading-none text-zinc-200 sm:text-[42px]"
                  aria-hidden
                >
                  {String(row.position + 1).padStart(2, "0")}
                </span>
                <article className="flex gap-4 rounded-2xl px-1 py-2">
                  <div className="relative h-[5.7rem] w-[3.7rem] shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="60px"
                        unoptimized={imageNeedsUnoptimized(src)}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xl font-semibold leading-tight text-zinc-900">{row.item.title}</p>
                    {row.item.year ? <p className="mt-1.5 text-sm text-zinc-600">{row.item.year}</p> : null}
                    {row.item.director?.trim() ? (
                      <p className="mt-1 text-xs text-zinc-500">{`Directed by ${row.item.director}`}</p>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        <section className="mt-8 border-t border-zinc-100 pt-5">
          <p className="text-xs text-zinc-500">Created on {createdDateLabel(list.createdAt)}</p>
        </section>

        <aside className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-6 py-9 text-center sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            See more from {curator}
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-[15px]">
            Discover more curated lists and reviews on Kanon.
          </p>
          <Link
            href={profileHref}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Join Kanon
          </Link>
        </aside>

        <footer className="mt-12 flex flex-col gap-4 border-t border-zinc-100 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Kanon. A space for cultural taste.</p>
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
