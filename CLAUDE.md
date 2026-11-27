# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (next dev --webpack), http://localhost:3000
npm run build    # prisma generate + next build
npm run lint     # eslint
```

There is no test framework configured (no jest/vitest in package.json). `scripts/testImportNormalization.ts` and `scripts/testImportUpsert.ts` are standalone ad-hoc scripts, not part of a test runner — read them before assuming how to invoke them.

Database (Prisma + Postgres):
```bash
npx prisma generate           # regenerate client (also runs on postinstall and build)
npx prisma migrate dev        # create/apply a migration locally
```
Schema is at `prisma/schema.prisma`; config (`prisma.config.ts`) resolves it via `DATABASE_URL`/`DIRECT_URL`.

## Production database safety (user preference, always applies)

When suggesting or writing SQL, migrations, or destructive operations against **production** (or any shared/live data):

1. **Never run `UPDATE` or `DELETE` in production without a backup first** — confirm a recent backup exists, or take one before mutating data.
2. **Always run a `SELECT` first** that matches the same `WHERE` (and joins) as the intended `UPDATE`/`DELETE`, so we see exactly which rows will change.
3. **When in doubt, do nothing destructive** until fully sure — prefer read-only checks, dry runs, or staging.

Applies to Prisma/raw SQL, the Supabase SQL editor, admin scripts, and one-off fixes. Remind the user of these points whenever production data is involved.

## Architecture

Next.js (App Router) app, but **auth is on the legacy Pages Router**: `pages/api/auth/[...nextauth].ts` defines `authOptions` (NextAuth + Google provider + Prisma adapter, JWT sessions). Every `app/api/**` route that needs the session imports `authOptions` from `@/pages/api/auth/[...nextauth]` and calls `getServerSession(authOptions)` — there is no `app/api/auth` route handler despite the empty directory that suggests one.

Domain model (`prisma/schema.prisma`): `User`, `Item` (FILM/SHOW/BOOK, sourced from TMDB movies/TV or Google Books), `Review`, `List`/`ListItem`, `SavedItem`/`SavedList`, `Follow`, `Notification`, `ReviewRatingReaction`. Content ingestion lives in `lib/content/` (`googleBooks.ts`, `tmdb.ts`, normalizers per source, `upsertImportedItem.ts`); one-off import scripts are in `scripts/`.

Feature logic is split out of route handlers into `lib/`: `lib/feed.ts` (home feed), `lib/lists.ts`, `lib/savedLists.ts`, `lib/notifications.ts`, `lib/tasteMatch/` and `lib/tasteClash/` (compatibility scoring between users), `lib/publicList/` and `lib/publicReview/` (public share-page data loading).

**Database connection resilience is a deliberate, repeated pattern** — this app runs serverless against a pooled Postgres (Supabase transaction pooler / PgBouncer), so pool exhaustion is expected in normal operation, not exceptional:
- `lib/prisma.ts` builds the `DATABASE_URL` at startup: appends `pgbouncer=true` for Supabase pooler hosts, sets `pool_timeout=5` (fail fast instead of hanging ~60s), caps `connection_limit=10` outside production, and caches the client on `globalThis` — but only reuses the cached client if it has current delegates (`reviewRatingReaction`, `notification`), because webpack hot reload can otherwise resurrect a stale pre-`prisma generate` client.
- Routes and lib functions that hit the DB under load (`lib/feed.ts`, `lib/notifications.ts`, `app/api/saved/route.ts`, `app/api/profile/route.ts`, `app/api/items/route.ts`, `app/api/me/route.ts`, `app/api/items/browse/route.ts`, `app/api/notifications/unread-count/route.ts`) each define an `isTransient*`/`isConnectionPoolTimeoutError` check matching Prisma `P2024`, "Unable to check out connection from the pool", "Timed out fetching a new connection", and `MaxClientsInSessionMode: max clients reached` — and respond with a 503-style "busy, retry" instead of a 500. When adding a new DB-backed route under load (feed, counts, listing endpoints), follow this same transient-error pattern rather than letting pool errors surface as generic 500s.

Public share pages (`app/r/[publicShareId]`, `app/l/[listId]`, `app/match/[handleA]`) render OG/Twitter meta images server-side. README's "Share Preview Regression Checklist" covers what to verify when touching these: OG tags present in page source, `og:image` must be absolute (`https://<host>/...`), the `opengraph-image` route must return `200`/`image/png` even when data/images fail (safe fallback, no 500s), and a crawler UA fetch (`curl -A "facebookexternalhit/1.1" ...`) must still show OG tags.

Path alias `@/*` maps to the repo root (`tsconfig.json`).

## Product context

Kanon is pitched as *"your cultural club"* — one social product spanning films, shows, and books, not a single-medium tracker. A few product decisions aren't obvious from the code alone:

- **Catalog has no dedup safeguard.** The Add flow (`app/add`) lets a user create a new `Item` on the spot if search finds no match. Duplicate `Item` rows for the same film/show/book are an accepted, unresolved gap — not a bug to "fix" by adding stricter uniqueness without discussion.
- **Item pages are wiki-style; reviews are not.** Any logged-in user can edit an item's `director`/`description`/`tags` — deliberate, so item metadata stays crowd-corrected. Reviews are personal and not editable by others.
- **Ratings are 1.0–10.0 with one decimal** (hence `Review.rating` is `Float`), entered via a two-step UI: tap a whole number, then fine-tune with a decimal slider. The review prompt is framed as "what did it make you feel" — reviews are emotional reaction, not critique. Rating filters match by decile band (clicking "9" matches 9.0–9.9), not exact value.
- **No inline rating on the item page.** This was tried and deliberately reverted — rating always routes through `/items/[id]/review`. Don't reintroduce inline rating without checking why it was removed.
- **"Home" and "Discover" are named/routed inconsistently.** Home ("For You") is a social feed of *reviews* from users you follow — not a browse-everything feed. Discover is the product name for the `/search` route, which browses the item catalog (Culture toggle) and separately finds/follows people (People toggle). Route path and feature name diverge; don't assume one from the other.
- **No logged-out public browsing.** `/` redirects unauthenticated visitors to `/login`. Public reach happens only through the dedicated share routes (`app/r/*`, `app/l/*`, `app/match/*`).
- **Handles are case-insensitive** (stored/compared lowercased); self-follow is rejected with a 400.
- **"Similar Content" is an acknowledged stub** — it queries the 8 most-recently-created other items, not a real recommendation algorithm. Don't assume smarter logic exists elsewhere.
- **`lib/tasteClash/` is an empty directory with no documented intent.** Unlike `lib/tasteMatch/`, its purpose was never recorded anywhere found (code, README, or prior chat history) — ask before assuming what it should do or filling it in.

## Always save to GitHub

This project is linked to https://github.com/mayhemjacob/kanon (branch `main`). **This repo is public** (it's part of Jacobo's portfolio). Jacobo wants everything backed up on GitHub so it doesn't depend on a single computer:

Working model: GitHub is the source of truth; the local folder (one folder per project, e.g. `Jacob's Projects/kanon`) is the working copy. Until `git push`, work exists only on this computer.

- At the start of a session: check `git remote -v` points to `github.com/mayhemjacob/kanon`, then `git pull --ff-only`. Remind Jacobo if the remote is missing or wrong.
- After each task or coherent set of changes (not just at the end of the day): `git add` what changed, `git commit` with a clear message, and `git push origin main` — without waiting to be asked.
- After pushing, verify it: `git status` must be clean and not "ahead of origin". Tell Jacobo explicitly that the push landed.
- Only one place edits the project at a time (local folder vs. a cloud session): pull before switching, push before leaving.
- Never commit `.env*`, keys, passwords, user data or heavy files. Because the repo is public, anything private (internal notes, metrics, business plans) does not belong here.
- If the push fails (conflict, credentials), tell Jacobo instead of forcing it.
- If a session ends with uncommitted or unpushed work, say so before closing.
