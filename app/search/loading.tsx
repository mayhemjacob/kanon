export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 pb-20">
        <div className="h-8 w-32 rounded bg-zinc-200 animate-pulse" />
        <div className="mt-4 h-10 rounded-2xl bg-zinc-100 animate-pulse" />
        <div className="mt-4 flex gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-7 w-16 rounded-full bg-zinc-100 animate-pulse" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-zinc-100 animate-pulse">
              <div className="aspect-[3/4] w-full bg-zinc-200" />
              <div className="p-2 space-y-2">
                <div className="h-3 w-3/4 rounded bg-zinc-200" />
                <div className="h-3 w-1/2 rounded bg-zinc-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
