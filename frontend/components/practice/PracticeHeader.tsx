"use client";

import { Building2, CalendarClock, CircleDot, FolderKanban, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useDemoStore } from "@/lib/demo-state";
import type { Practice, PracticePhase, PracticeStatus } from "@/lib/types";

type PracticeHeaderProps = {
  practice: Practice;
  phases: PracticePhase[];
};

const labelVariant = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "default",
} as const;

type ExposedPracticeStatus = Extract<PracticeStatus, "aperta" | "sospesa" | "chiusa">;

const statusLabel: Record<ExposedPracticeStatus, string> = {
  aperta: "Aperta",
  chiusa: "Chiusa",
  sospesa: "Sospesa",
};

const statusVariant: Record<ExposedPracticeStatus, "info" | "success" | "warning"> = {
  aperta: "info",
  chiusa: "success",
  sospesa: "warning",
};

function exposedStatus(status: PracticeStatus): ExposedPracticeStatus {
  if (status === "chiusa" || status === "sospesa") return status;
  return "aperta";
}

export function PracticeHeader({ practice, phases }: PracticeHeaderProps) {
  const activeUser = useDemoStore((state) => state.activeUser);
  const applyAction = useDemoStore((state) => state.applyAction);
  const currentStatus = exposedStatus(practice.status);
  const canClose = phases.length > 0 && phases.every((phase) => phase.status === "done" || phase.status === "skipped");
  const canEdit = activeUser.permission !== "viewer";

  function handleStatusChange(value: string) {
    const nextStatus = value as ExposedPracticeStatus;
    if (nextStatus === currentStatus) return;
    if (nextStatus === "chiusa") {
      if (!canClose) return;
      const confirmed = window.confirm("Chiudere la pratica? L'operazione e' irreversibile in V0");
      if (!confirmed) return;
    }
    applyAction({ type: "set_practice_status", status: nextStatus });
  }

  return (
    <header className="rounded-b-[28px] border-b border-border bg-surface-low/80 px-6 py-3 shadow-electric backdrop-blur md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-label text-xs font-semibold text-muted">{practice.code}</span>
          <span className="h-1 w-1 rounded-full bg-muted" />
          <span className="font-semibold text-foreground">{practice.client.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={statusVariant[currentStatus]}>
              <CircleDot className="h-3.5 w-3.5" />
              {statusLabel[currentStatus]}
            </Badge>
            <select
              aria-label="Stato pratica"
              className="h-9 rounded-xl border border-border bg-surface-container px-3 text-sm font-semibold text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canEdit}
              onChange={(event) => handleStatusChange(event.target.value)}
              title={
                !canEdit
                  ? "Permesso non disponibile per utente viewer"
                  : canClose
                    ? "Cambia stato pratica"
                    : "Completa tutte le fasi prima di chiudere"
              }
              value={currentStatus}
            >
              <option value="aperta">Aperta</option>
              <option value="sospesa">Sospesa</option>
              <option disabled={!canClose} value="chiusa">
                Chiusa
              </option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-center">
          <div className="min-w-0 space-y-2">
            <h1 className="truncate font-display text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              {practice.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">
                <FolderKanban className="h-3.5 w-3.5" />
                {practice.category}
              </Badge>
              {practice.labels.map((label) => (
                <Badge key={label.id} variant={labelVariant[label.tone]}>
                  <Tag className="h-3.5 w-3.5" />
                  {label.name}
                </Badge>
              ))}
              <span className="truncate text-sm text-muted">{practice.description}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-container p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span className="font-display uppercase tracking-[0.16em]">Avanzamento</span>
              <span className="font-label font-semibold text-electric">{practice.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-high">
              <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${practice.progress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-electric" />
                {new Intl.DateTimeFormat("it-IT").format(new Date(practice.dueDate))}
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-electric" />
                {practice.client.city}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
