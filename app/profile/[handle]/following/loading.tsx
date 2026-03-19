export default function FollowingLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-100 animate-pulse" />
          <div className="h-6 w-24 rounded bg-zinc-200 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-zinc-100 p-3">
              <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
                <div className="h-3 w-32 rounded bg-zinc-100 animate-pulse" />
              </div>
              <div className="h-8 w-20 rounded-full bg-zinc-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
