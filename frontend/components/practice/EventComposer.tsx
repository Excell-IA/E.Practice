"use client";

import { Mail, MessageSquareText, PhoneCall } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/lib/demo-state";
import type { PracticeEvent, PracticePhase } from "@/lib/types";

type ComposerKind = PracticeEvent["type"] | "note";

type EventComposerProps = {
  phases: PracticePhase[];
  currentPhase?: PracticePhase | null;
  defaultDate?: string;
  /** Se passato, la data è controllata dal parent (es. albero che setta da click-tronco). */
  controlledDate?: string;
  onControlledDateChange?: (date: string) => void;
  /** Se passato, il phaseId è controllato dal parent. */
  controlledPhaseId?: string | null;
  onControlledPhaseIdChange?: (phaseId: string | null) => void;
  className?: string;
};

function todayIsoLocal(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function EventComposer({
  phases,
  currentPhase,
  defaultDate,
  controlledDate,
  onControlledDateChange,
  controlledPhaseId,
  onControlledPhaseIdChange,
  className,
}: EventComposerProps) {
  const applyAction = useDemoStore((state) => state.applyAction);
  const activeUser = useDemoStore((state) => state.activeUser);
  const canEdit = activeUser.permission !== "viewer";

  const [internalDate, setInternalDate] = useState<string>(defaultDate ?? todayIsoLocal());
  const [internalPhaseId, setInternalPhaseId] = useState<string | null>(currentPhase?.id ?? null);
  const [composerType, setComposerType] = useState<ComposerKind | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerDescription, setComposerDescription] = useState("");

  const date = controlledDate ?? internalDate;
  const phaseId = controlledPhaseId ?? internalPhaseId;

  function setDate(next: string) {
    if (onControlledDateChange) onControlledDateChange(next);
    else setInternalDate(next);
  }

  function setPhaseId(next: string | null) {
    if (onControlledPhaseIdChange) onControlledPhaseIdChange(next);
    else setInternalPhaseId(next);
  }

  function closestPhaseId(target: string): string | null {
    if (phases.length === 0) return null;
    const targetTime = new Date(target).getTime();
    let closest: PracticePhase = phases[0];
    let bestDelta = Math.abs(new Date(closest.plannedDate).getTime() - targetTime);
    for (const phase of phases) {
      const delta = Math.abs(new Date(phase.plannedDate).getTime() - targetTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        closest = phase;
      }
    }
    return closest.id;
  }

  function openComposer(eventType: ComposerKind) {
    setComposerType(eventType);
    setComposerTitle("");
    setComposerDescription("");
    if (phaseId === null) {
      setPhaseId(currentPhase?.id ?? closestPhaseId(date));
    }
  }

  function submit() {
    if (!composerType) return;
    if (composerType === "note") {
      if (!composerDescription.trim()) return;
      applyAction({
        type: "add_note",
        body: composerDescription.trim(),
        occurredAt: date,
      });
    } else {
      const effectivePhaseId = phaseId ?? currentPhase?.id ?? closestPhaseId(date);
      if (!effectivePhaseId || !composerTitle.trim()) return;
      applyAction({
        type: "create_event",
        description: composerDescription.trim() || "",
        eventType: composerType,
        occurredAt: date,
        phaseId: effectivePhaseId,
        title: composerTitle.trim(),
      });
    }
    setComposerType(null);
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
            Aggiungi evento
          </p>
          <label className="mt-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Data</span>
            <input
              className="h-9 rounded-xl border border-border bg-surface-container px-3 font-label text-sm font-semibold text-foreground outline-none"
              lang="it-IT"
              onChange={(event) => {
                const next = event.target.value;
                setDate(next);
                setPhaseId(closestPhaseId(next));
              }}
              title="Imposta la data dell'evento"
              type="date"
              value={date}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={!canEdit}
            onClick={() => openComposer("note")}
            title={canEdit ? "Aggiungi nota" : "Permesso non disponibile per utente viewer"}
            type="button"
            variant="outline"
          >
            <MessageSquareText className="h-4 w-4" />
            Nota
          </Button>
          <Button
            disabled={!canEdit}
            onClick={() => openComposer("call")}
            title={canEdit ? "Aggiungi telefonata" : "Permesso non disponibile per utente viewer"}
            type="button"
            variant="outline"
          >
            <PhoneCall className="h-4 w-4" />
            Telefonata
          </Button>
          <Button
            disabled={!canEdit}
            onClick={() => openComposer("mail")}
            title={canEdit ? "Aggiungi email" : "Permesso non disponibile per utente viewer"}
            type="button"
            variant="outline"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
        </div>
      </div>

      {composerType ? (
        <div className="mt-3 rounded-2xl border border-border bg-surface-container px-4 py-3">
          {composerType === "note" ? (
            <div className="grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-center">
              <Badge className="justify-self-start px-3 py-1.5" variant="info">
                <span className="font-display text-sm font-bold uppercase tracking-wider">Nota</span>
              </Badge>
              <label className="text-sm font-semibold text-muted">
                Testo della nota
                <textarea
                  autoFocus
                  className="mt-1 min-h-20 w-full resize-none rounded-xl border border-border bg-surface-low p-3 font-normal text-foreground outline-none"
                  onChange={(event) => setComposerDescription(event.target.value)}
                  placeholder="Scrivi qui la nota..."
                  value={composerDescription}
                />
              </label>
              <div className="flex gap-2">
                <Button disabled={!composerDescription.trim() || !date} onClick={submit} type="button">
                  Salva
                </Button>
                <Button onClick={() => setComposerType(null)} type="button" variant="ghost">
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[140px_1fr_1.4fr_auto] md:items-center">
              <Badge className="justify-self-start px-3 py-1.5" variant={composerType === "warning" ? "warning" : "info"}>
                <span className="font-display text-sm font-bold uppercase tracking-wider">
                  {composerType === "call" ? "Telefonata" : composerType === "mail" ? "Email" : "Avviso"}
                </span>
              </Badge>
              <label className="text-sm font-semibold text-muted">
                Titolo
                <input
                  autoFocus
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 font-normal text-foreground outline-none"
                  onChange={(event) => setComposerTitle(event.target.value)}
                  placeholder="Titolo evento"
                  value={composerTitle}
                />
              </label>
              <label className="text-sm font-semibold text-muted">
                Descrizione
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 font-normal text-foreground outline-none"
                  onChange={(event) => setComposerDescription(event.target.value)}
                  placeholder={`Collegato a ${currentPhase?.title ?? "fase corrente"}`}
                  value={composerDescription}
                />
              </label>
              <div className="flex gap-2">
                <Button disabled={!composerTitle.trim() || !date} onClick={submit} type="button">
                  Crea
                </Button>
                <Button onClick={() => setComposerType(null)} type="button" variant="ghost">
                  Annulla
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
