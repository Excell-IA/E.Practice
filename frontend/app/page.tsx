import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-foreground">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-surface-low p-10 shadow-electric">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center">
          <Image
            alt="ExcellIA"
            className="h-auto w-72 flex-shrink-0 sm:w-80"
            height={240}
            priority
            src="/logo-excellia.svg"
            width={320}
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
      </div>
    </main>
  );
}
