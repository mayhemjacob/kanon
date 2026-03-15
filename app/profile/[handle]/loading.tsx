export default function ProfileHandleLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div className="-mt-2 -mx-2 mb-2">
          <div className="h-10 w-10 rounded-full bg-zinc-100 animate-pulse" />
        </div>

        <header className="text-center space-y-3">
          <div className="mx-auto h-20 w-20 rounded-full bg-zinc-200 animate-pulse" />
          <div className="h-4 w-24 mx-auto rounded bg-zinc-200 animate-pulse" />
          <div className="h-4 w-48 mx-auto rounded bg-zinc-100 animate-pulse" />
          <div className="flex justify-center gap-8">
            <div className="h-4 w-8 rounded bg-zinc-100 animate-pulse" />
            <div className="h-4 w-8 rounded bg-zinc-100 animate-pulse" />
          </div>
          <div className="h-10 w-28 mx-auto rounded-full bg-zinc-200 animate-pulse" />
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-14 rounded-full bg-zinc-100 animate-pulse" />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-4 w-12 rounded bg-zinc-100 animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-6 rounded-full bg-zinc-100 animate-pulse" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-zinc-100 animate-pulse">
                <div className="aspect-[3/4] w-full bg-zinc-200" />
                <div className="p-2 space-y-2">
                  <div className="h-3 w-full rounded bg-zinc-200" />
                  <div className="h-3 w-2/3 rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
