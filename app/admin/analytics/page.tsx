import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

type DayCountRow = {
  day: Date;
  users_count: number;
  reviews_count: number;
  lists_count: number;
};

type DayPoint = {
  dayLabel: string;
  users: number;
  reviews: number;
  lists: number;
};

function getAllowedAdminEmails(): Set<string> {
  const fromEnv = (process.env.ANALYTICS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  // Safe fallback for current founder account in this repo setup.
  fromEnv.push("jacobo.miralles@gmail.com");
  return new Set(fromEnv);
}

function shortDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function TinyBarChart({
  title,
  data,
  getValue,
}: {
  title: string;
  data: DayPoint[];
  getValue: (row: DayPoint) => number;
}) {
  const max = Math.max(1, ...data.map((row) => toNumber(getValue(row))));

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 flex h-36 items-end gap-1.5">
        {data.map((row) => {
          const value = toNumber(getValue(row));
          const pct = Math.max(3, Math.round((value / max) * 100));
          return (
            <div key={row.dayLabel} className="flex h-full flex-1 items-end">
              <div
                className="w-full rounded-sm bg-zinc-900/85"
                style={{ height: `${pct}%` }}
                title={`${row.dayLabel}: ${value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>{data[0]?.dayLabel}</span>
        <span>{data[data.length - 1]?.dayLabel}</span>
      </div>
    </section>
  );
}

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const sessionEmail = (session.user.email ?? "").trim().toLowerCase();
  if (!sessionEmail || !getAllowedAdminEmails().has(sessionEmail)) {
    notFound();
  }

  const now = new Date();
  const since7 = new Date(now);
  since7.setDate(now.getDate() - 7);
  const since30 = new Date(now);
  since30.setDate(now.getDate() - 30);

  const [
    totalUsers,
    usersLast7Days,
    usersLast30Days,
    totalReviews,
    totalLists,
    totalFollows,
    latestUsers,
    mostReviewedItems,
    dayRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.review.count(),
    prisma.list.count(),
    prisma.follow.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        handle: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.review.groupBy({
      by: ["itemId"],
      _count: { _all: true },
      _avg: { rating: true },
      orderBy: { _count: { itemId: "desc" } },
      take: 12,
    }),
    prisma.$queryRaw<DayCountRow[]>(Prisma.sql`
      SELECT
        s.day::date AS day,
        COALESCE(u.users_count, 0)::int AS users_count,
        COALESCE(r.reviews_count, 0)::int AS reviews_count,
        COALESCE(l.lists_count, 0)::int AS lists_count
      FROM generate_series(
        current_date - interval '29 days',
        current_date,
        interval '1 day'
      ) AS s(day)
      LEFT JOIN (
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS users_count
        FROM "User"
        WHERE "createdAt" >= current_date - interval '29 days'
        GROUP BY 1
      ) u ON u.day = s.day::date
      LEFT JOIN (
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS reviews_count
        FROM "Review"
        WHERE "createdAt" >= current_date - interval '29 days'
        GROUP BY 1
      ) r ON r.day = s.day::date
      LEFT JOIN (
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS lists_count
        FROM "List"
        WHERE "createdAt" >= current_date - interval '29 days'
        GROUP BY 1
      ) l ON l.day = s.day::date
      ORDER BY s.day ASC
    `),
  ]);

  const topItemIds = mostReviewedItems.map((row) => row.itemId);
  const topItems = topItemIds.length
    ? await prisma.item.findMany({
        where: { id: { in: topItemIds } },
        select: { id: true, title: true, year: true, type: true },
      })
    : [];
  const itemById = new Map(topItems.map((i) => [i.id, i]));

  const dayData: DayPoint[] = dayRows.map((row) => ({
    dayLabel: shortDayLabel(new Date(row.day)),
    users: toNumber(row.users_count),
    reviews: toNumber(row.reviews_count),
    lists: toNumber(row.lists_count),
  }));

  const kpis = [
    { label: "Total users", value: totalUsers },
    { label: "Users (last 7d)", value: usersLast7Days },
    { label: "Users (last 30d)", value: usersLast30Days },
    { label: "Total reviews", value: totalReviews },
    { label: "Total lists", value: totalLists },
    { label: "Total follows", value: totalFollows },
  ];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Private founder dashboard</p>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-zinc-200 bg-white p-3"
            >
              <div className="text-xs text-zinc-500">{kpi.label}</div>
              <div className="mt-1 text-xl font-semibold text-zinc-900">
                {kpi.value.toLocaleString()}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <TinyBarChart
            title="Users by day (30d)"
            data={dayData}
            getValue={(row) => row.users}
          />
          <TinyBarChart
            title="Reviews by day (30d)"
            data={dayData}
            getValue={(row) => row.reviews}
          />
          <TinyBarChart
            title="Lists by day (30d)"
            data={dayData}
            getValue={(row) => row.lists}
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Latest users</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="pb-2">Handle / Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {latestUsers.map((user) => (
                    <tr key={user.id} className="border-t border-zinc-100">
                      <td className="py-2 text-zinc-900">
                        {user.handle ? `@${user.handle}` : user.name || "—"}
                      </td>
                      <td className="py-2 text-zinc-600">{user.email ?? "—"}</td>
                      <td className="py-2 text-zinc-600">
                        {user.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Most reviewed items
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="pb-2">Item</th>
                    <th className="pb-2">Reviews</th>
                    <th className="pb-2">Avg rating</th>
                  </tr>
                </thead>
                <tbody>
                  {mostReviewedItems.map((row) => {
                    const item = itemById.get(row.itemId);
                    return (
                      <tr key={row.itemId} className="border-t border-zinc-100">
                        <td className="py-2 text-zinc-900">
                          {item ? `${item.title}${item.year ? ` (${item.year})` : ""}` : row.itemId}
                        </td>
                        <td className="py-2 text-zinc-600">{row._count._all}</td>
                        <td className="py-2 text-zinc-600">
                          {row._avg.rating == null
                            ? "—"
                            : Number(row._avg.rating).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

