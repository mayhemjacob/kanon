export default function RootLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div className="h-7 w-24 rounded bg-zinc-200 animate-pulse" />
            <div className="h-5 w-16 rounded bg-zinc-100 animate-pulse" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 w-14 rounded-full bg-zinc-100 animate-pulse" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-4 w-12 rounded bg-zinc-100 animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-6 w-6 rounded-full bg-zinc-100 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-4 pb-20">
          {[1, 2, 3].map((i) => (
            <article key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="space-y-1">
                      <div className="h-3 w-16 rounded bg-zinc-200 animate-pulse" />
                      <div className="h-3 w-12 rounded bg-zinc-100 animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-4 w-4 rounded bg-zinc-100 animate-pulse" />
                      <div className="h-4 w-4 rounded bg-zinc-100 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
                    <div className="aspect-[3/4] w-20 rounded-lg bg-zinc-200 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 rounded bg-zinc-200 animate-pulse" />
                      <div className="h-8 w-12 rounded bg-zinc-200 animate-pulse" />
                      <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
                      <div className="h-4 w-4/5 rounded bg-zinc-100 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
