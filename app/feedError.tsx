"use client";

export default function FeedError() {
    return (
        <main className="min-h-screen bg-white">
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
                <header className="mb-6 sm:mb-8">
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">For you</h1>
                </header>
                <section className="flex flex-col items-center justify-center rounded-3xl bg-zinc-50 px-6 py-16 text-center">
                    <p className="text-sm text-zinc-600">Could not load your feed. Please try again.</p>
                    <button
                        type="button"
                        onClick={() => location.reload()}
                        className="mt-4 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
                    >
                        Retry
                    </button>
                </section>
            </div>
        </main>
    );
}
