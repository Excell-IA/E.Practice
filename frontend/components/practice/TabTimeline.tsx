"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle2, Mail, MessageSquareText, PhoneCall, PlayCircle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { EventComposer } from "@/components/practice/EventComposer";
import { useDemoStore, type DemoNote } from "@/lib/demo-state";
import { phaseStatusLabel } from "@/lib/phase-labels";
import type { PracticeEvent, PracticePhase, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabTimelineProps = {
  phases: PracticePhase[];
  events: PracticeEvent[];
  onSwitchTab?: (tab: "info" | "albero" | "timeline" | "allegati" | "note" | "anagrafica") => void;
  onRequestTreeSelect?: (kind: "phase" | "event", id: string) => void;
};

type TimelineFilter = "all" | "phases" | "events" | "notes";
type BadgeVariant = "default" | "info" | "success" | "warning" | "danger";

type TimelineEntry = {
  id: string;
  kind: "phase" | "event" | "note";
  typeLabel: string;
  title: string;
  subtitle: string;
  date: string;
  statusLabel?: string;
  statusVariant?: BadgeVariant;
  author?: User;
  icon: ReactNode;
  iconTitle: string;
  badgeVariant: BadgeVariant;
};

const filters: { label: string; title: string; value: TimelineFilter }[] = [
  { label: "Tutti", title: "Mostra fasi, eventi e note", value: "all" },
  { label: "Fasi", title: "Mostra solo le fasi del template", value: "phases" },
  { label: "Eventi", title: "Mostra solo eventi (mail, alert, call, ecc.)", value: "events" },
  { label: "Note", title: "Mostra solo note interne", value: "notes" },
];

function avatarClass(userId?: string) {
  if (userId?.endsWith("0001")) return "bg-[#14532d]";
  if (userId?.endsWith("0002")) return "bg-[#0f766e]";
  if (userId?.endsWith("0003")) return "bg-[#ea580c]";
  return "bg-[#6b7280]";
}

function eventMeta(event: PracticeEvent) {
  if (event.type === "call") {
    return {
      badgeVariant: "warning" as const,
      icon: <PhoneCall className="h-4 w-4" />,
      iconTitle: "Telefonata",
      typeLabel: "Evento - Telefonata",
    };
  }
  return {
    badgeVariant: "info" as const,
    icon: <Mail className="h-4 w-4" />,
    iconTitle: "Email",
    typeLabel: "Evento - Email",
  };
}

function phaseStatusVariant(status: PracticePhase["status"]): BadgeVariant {
  if (status === "done") return "success";
  if (status === "in_progress") return "info";
  if (status === "blocked") return "danger";
  if (status === "skipped") return "default";
  return "warning";
}

function noteDate(note: DemoNote) {
  const noteWithOccurredAt = note as DemoNote & { occurredAt?: string | null };
  return noteWithOccurredAt.occurredAt ?? note.createdAt;
}

function buildEntries(phases: PracticePhase[], events: PracticeEvent[], notes: DemoNote[]) {
  const phaseEntries = phases.map((phase): TimelineEntry => ({
    badgeVariant: "info",
    date: phase.plannedDate || phase.dueDate,
    icon: phase.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />,
    iconTitle: phase.status === "done" ? "Fase completata" : "Fase del template",
    id: phase.id,
    kind: "phase",
    statusLabel: phaseStatusLabel[phase.status],
    statusVariant: phaseStatusVariant(phase.status),
    subtitle: `Fase ${phase.order} del template`,
    title: phase.title,
    typeLabel: "Fase",
  }));

  const eventEntries = events.map((event): TimelineEntry => {
    const meta = eventMeta(event);
    return {
      author: event.author,
      badgeVariant: meta.badgeVariant,
      date: event.occurredAt,
      icon: meta.icon,
      iconTitle: meta.iconTitle,
      id: event.id,
      kind: "event",
      subtitle: event.description,
      title: event.title,
      typeLabel: meta.typeLabel,
    };
  });

  const noteEntries = notes.map((note): TimelineEntry => ({
    author: note.author,
    badgeVariant: "default",
    date: noteDate(note),
    icon: <MessageSquareText className="h-4 w-4" />,
    iconTitle: "Nota",
    id: note.id,
    kind: "note",
    subtitle: note.body.length > 90 ? `${note.body.slice(0, 90)}...` : note.body,
    title: `Nota da ${note.author.name}`,
    typeLabel: "Nota",
  }));

  return [...phaseEntries, ...eventEntries, ...noteEntries];
}

function matchesFilter(entry: TimelineEntry, filter: TimelineFilter) {
  if (filter === "all") return true;
  if (filter === "phases") return entry.kind === "phase";
  if (filter === "events") return entry.kind === "event";
  return entry.kind === "note";
}

function formatDate(date: string) {
  return format(new Date(date), "dd/MM/yyyy", { locale: it });
}

export function TabTimeline({ events, onRequestTreeSelect, onSwitchTab, phases }: TabTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const notes = useDemoStore((state) => state.notes);
  const entries = useMemo(() => buildEntries(phases, events, notes), [events, notes, phases]);
  const visibleEntries = useMemo(
    () =>
      entries
        .filter((entry) => matchesFilter(entry, filter))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries, filter],
  );

  function handleEntryClick(entry: TimelineEntry) {
    if (entry.kind === "note") {
      onSwitchTab?.("note");
      window.setTimeout(() => document.getElementById(`note-${entry.id}`)?.scrollIntoView({ block: "center" }), 120);
      return;
    }
    if (entry.kind === "phase" || entry.kind === "event") {
      onRequestTreeSelect?.(entry.kind, entry.id);
    }
  }

  const currentPhase = phases.find((phase) => phase.status === "in_progress") ?? phases[0] ?? null;

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface-low p-5">
      <EventComposer className="mb-5 shrink-0" currentPhase={currentPhase} phases={phases} />
      <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Timeline cronologica
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground">Attivita della pratica</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              className={cn(
                "h-10 rounded-full border px-5 text-base font-semibold transition-colors",
                filter === item.value
                  ? "border-electric bg-electric/10 text-electric"
                  : "border-border bg-surface-container text-muted hover:text-foreground",
              )}
              key={item.value}
              onClick={() => setFilter(item.value)}
              title={item.title}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visibleEntries.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface-container">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-surface-high text-left font-display text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Titolo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Autore</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr
                  className="cursor-pointer border-t border-border transition-colors hover:bg-surface-high"
                  key={entry.id}
                  onClick={() => handleEntryClick(entry)}
                  role="button"
                  tabIndex={0}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-low text-electric"
                        title={entry.iconTitle}
                      >
                        {entry.icon}
                      </span>
                      <Badge variant={entry.badgeVariant}>{entry.typeLabel}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{entry.title}</p>
                    {entry.subtitle ? <p className="mt-1 line-clamp-1 text-xs text-muted">{entry.subtitle}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-label text-foreground-variant">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-4 py-3">
                    {entry.statusLabel && entry.statusVariant ? (
                      <Badge variant={entry.statusVariant}>{entry.statusLabel}</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {entry.author ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
                            avatarClass(entry.author.id),
                          )}
                        >
                          {entry.author.initials}
                        </span>
                        <span className="whitespace-nowrap text-foreground-variant">{entry.author.name}</span>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-container p-10 text-center text-sm text-muted">
          Nessuna attivita registrata
        </div>
      )}
    </section>
  );
}
