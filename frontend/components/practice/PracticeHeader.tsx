"use client";

import { CircleDot, FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HelpButton } from "@/components/ui/help-button";
import type { Practice, PracticePhase, PracticeStatus } from "@/lib/types";

type PracticeHeaderProps = {
  practice: Practice;
  phases: PracticePhase[];
};

type ExposedPracticeStatus = Extract<PracticeStatus, "aperta" | "in_attesa" | "sospesa" | "chiusa">;

const statusLabel: Record<ExposedPracticeStatus, string> = {
  aperta: "Aperta",
  in_attesa: "In attesa",
  sospesa: "Sospesa",
  chiusa: "Chiusa",
};

const statusVariant: Record<ExposedPracticeStatus, "info" | "success" | "warning"> = {
  aperta: "info",
  in_attesa: "warning",
  sospesa: "warning",
  chiusa: "success",
};

function exposedStatus(status: PracticeStatus): ExposedPracticeStatus {
  if (status === "chiusa" || status === "sospesa" || status === "in_attesa") return status;
  return "aperta";
}

export function PracticeHeader({ practice, phases }: PracticeHeaderProps) {
  const currentStatus = exposedStatus(practice.status);
  const phasesClosed = phases.filter((phase) => phase.status === "done" || phase.status === "skipped").length;

  return (
    <header className="rounded-b-[28px] border-b border-border bg-surface-low/80 px-6 py-3 shadow-electric backdrop-blur md:px-10">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-label text-xs font-semibold text-muted">{practice.code}</span>
          <span className="h-1 w-1 rounded-full bg-muted" />
          <span className="font-semibold text-foreground">{practice.client.name}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <HelpButton title="Dettaglio pratica" subtitle="Albero, fasi, eventi e note in un'unica vista">
              <section>
                <p>Questa schermata mostra tutto cio&apos; che riguarda la pratica. La vista che la rende diversa
                da un classico gestionale e&apos; l&apos;<strong className="text-foreground">Albero attivo</strong>:
                la linea del tempo della pratica con tutte le fasi del template, gli eventi (telefonate,
                email, avvisi) e le note libere posizionati nel giorno in cui sono accaduti.</p>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Le tab in alto</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li><strong className="text-foreground">Info</strong>: riepilogo dati, scadenza, responsabile.</li>
                  <li><strong className="text-foreground">Albero attivo</strong>: la vista cronologica completa (la piu&apos; importante).</li>
                  <li><strong className="text-foreground">Timeline</strong>: lo stesso contenuto in formato lista.</li>
                  <li><strong className="text-foreground">Allegati</strong>: documenti caricati su questa pratica.</li>
                  <li><strong className="text-foreground">Note</strong>: appunti liberi del team.</li>
                  <li><strong className="text-foreground">Anagrafica</strong>: scheda del cliente.</li>
                </ul>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Come orientarsi nell&apos;albero</p>
                <p className="mt-2">Apri la tab <strong className="text-foreground">Albero attivo</strong>: cerca il
                cerchio <strong className="text-foreground">OGGI</strong> sul tronco, a sinistra ci sono le fasi passate
                e gli eventi accaduti, a destra quelle future. Clicca un cerchio (fase) o un&apos;icona (evento)
                per aprire il drawer di modifica. Aggiungi nuovi eventi dalla toolbar in alto.</p>
              </section>
              <section>
                <p>Lo <strong className="text-foreground">stato pratica</strong> (badge a destra del titolo) viene
                derivato automaticamente dallo stato delle fasi: <strong className="text-foreground">Sospesa</strong>
                se almeno una fase e&apos; bloccata, <strong className="text-foreground">Chiusa</strong> quando tutte
                sono Completate o Saltate, altrimenti <strong className="text-foreground">Aperta</strong>.</p>
              </section>
            </HelpButton>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                {practice.title}
              </h1>
              {practice.description ? (
                <p className="mt-1 truncate text-sm text-muted">{practice.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={statusVariant[currentStatus]}>
                <CircleDot className="h-3.5 w-3.5" />
                {statusLabel[currentStatus]}
              </Badge>
              <Badge variant="info">
                <FolderKanban className="h-3.5 w-3.5" />
                {practice.category}
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-container p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span className="font-display uppercase tracking-[0.16em]">Avanzamento</span>
              <span className="font-label font-semibold text-electric">
                {phasesClosed}/{phases.length} &middot; {practice.progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-high">
              <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${practice.progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
