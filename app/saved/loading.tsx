export default function SavedLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 pb-20">
        <div className="h-8 w-24 rounded bg-zinc-200 animate-pulse" />
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-14 rounded-full bg-zinc-100 animate-pulse" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-zinc-200">
              <div className="relative aspect-[3/4] w-full">
                <div className="h-full w-full animate-pulse bg-zinc-300" />
                <div className="absolute inset-0 p-1.5">
                  <div className="h-5 w-12 rounded-full bg-zinc-400/80" />
                </div>
              </div>
              <div className="absolute inset-x-3 bottom-3 h-4 w-24 animate-pulse rounded bg-zinc-400/80" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
