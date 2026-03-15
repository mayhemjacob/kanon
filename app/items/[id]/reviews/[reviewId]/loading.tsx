export default function ReviewPageLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header: back + item summary + actions */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 animate-pulse" />
            <div className="flex gap-4">
              <div className="h-24 w-16 shrink-0 rounded-xl bg-zinc-200 animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-48 rounded bg-zinc-200 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-4 w-8 rounded bg-zinc-100 animate-pulse" />
                  <div className="h-4 w-12 rounded bg-zinc-100 animate-pulse" />
                </div>
                <div className="h-4 w-24 rounded bg-zinc-100 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-9 rounded-full bg-zinc-100 animate-pulse" />
            <div className="h-9 w-9 rounded-full bg-zinc-100 animate-pulse" />
          </div>
        </div>

        {/* Review by */}
        <section className="space-y-4">
          <div className="h-3 w-20 rounded bg-zinc-100 animate-pulse" />
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-200 animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
                <div className="h-3 w-16 rounded bg-zinc-100 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <div className="h-3 w-14 rounded bg-zinc-100 animate-pulse" />
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 py-8">
              <div className="mx-auto h-10 w-16 rounded bg-zinc-200 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <div className="h-3 w-20 rounded bg-zinc-100 animate-pulse" />
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-zinc-100 animate-pulse" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
