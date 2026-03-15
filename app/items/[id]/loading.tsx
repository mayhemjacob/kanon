export default function ItemPageLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top bar */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 animate-pulse" />
        </div>

        {/* Main item header skeleton */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="aspect-[3/4] w-full max-w-[280px] shrink-0 overflow-hidden rounded-2xl bg-zinc-200 animate-pulse sm:max-w-[220px]" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-3/4 rounded-lg bg-zinc-200 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-4 w-12 rounded bg-zinc-100 animate-pulse" />
              <div className="h-4 w-14 rounded bg-zinc-100 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-10 rounded bg-zinc-200 animate-pulse" />
              <div className="h-4 w-8 rounded bg-zinc-100 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-9 w-9 rounded-full bg-zinc-100 animate-pulse" />
            </div>
            <div className="h-10 w-40 rounded-2xl bg-zinc-100 animate-pulse" />
          </div>
        </div>

        {/* Similar content skeleton */}
        <section className="mt-10">
          <div className="mb-4 h-4 w-32 rounded bg-zinc-200 animate-pulse" />
          <div className="flex gap-4 overflow-hidden pb-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-32 shrink-0 sm:w-36">
                <div className="aspect-[3/4] rounded-2xl bg-zinc-200 animate-pulse" />
                <div className="mt-2 h-3 w-full rounded bg-zinc-100 animate-pulse" />
                <div className="mt-1 h-3 w-1/2 rounded bg-zinc-100 animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
