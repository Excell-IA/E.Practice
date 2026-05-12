export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12">
        <p className="font-label text-xs font-semibold uppercase tracking-[0.12em] text-[var(--on-surface-muted)]">
          ExcellIA Work
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold">E.Practice</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--on-surface-variant)]">
          Scaffold frontend V0 pronto per le prossime fasi: shell, pagine, vista albero e
          integrazione API.
        </p>
      </section>
    </main>
  );
}
