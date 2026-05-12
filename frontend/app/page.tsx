import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-foreground">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface-low p-8 shadow-electric">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
          E.Practice
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Case management</h1>
        <p className="mt-3 text-foreground-variant">
          Scaffold frontend pronto per la demo Studio Leali. La prima vista tradotta e navigabile e il dettaglio
          pratica.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center rounded-xl bg-brand px-4 font-display text-sm font-semibold text-[var(--on-primary)]"
          href="/pratiche/PR-2026-042"
        >
          Apri pratica PR-2026-042
        </Link>
      </div>
    </main>
  );
}
