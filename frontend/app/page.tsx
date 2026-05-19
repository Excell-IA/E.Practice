import { HelpCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-foreground">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-surface-low p-10 shadow-electric">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center">
          <Image
            alt="ExcellIA"
            className="h-auto w-96 flex-shrink-0 sm:w-[500px]"
            height={400}
            priority
            src="/logo-excellia.svg"
            width={500}
          />
          <div>
            <h1 className="font-display text-5xl font-semibold tracking-tight">E.Practice</h1>
            <p className="mt-4 text-foreground-variant">
              Demo — gestione pratiche universale personalizzabile
            </p>
            <Link
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-brand px-6 font-display text-sm font-semibold text-[var(--on-primary)]"
              href="/home"
            >
              Entra
            </Link>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-surface-container/60 px-5 py-3 text-sm text-muted">
          <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-electric/40 bg-electric/10 text-electric">
            <HelpCircle className="h-5 w-5" />
          </span>
          <p>
            <span className="font-semibold text-foreground">Benvenuto.</span> Per capire come funziona ogni vista, clicca il pulsante con l&apos;icona qui accanto, sempre a sinistra del titolo della pagina.
          </p>
        </div>
      </div>
    </main>
  );
}
