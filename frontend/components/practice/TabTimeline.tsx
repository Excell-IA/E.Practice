"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle2, Mail, MessageSquareText, PhoneCall, PlayCircle, TriangleAlert } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDemoStore, type DemoNote } from "@/lib/demo-state";
import type { PracticeEvent, PracticePhase, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabTimelineProps = {
  phases: PracticePhase[];
  events: PracticeEvent[];
};

type TimelineFilter = "all" | "phases" | "events" | "notes";

type TimelineEntry = {
  id: string;
  kind: "phase" | "event" | "note";
  date: string;
  title: string;
  subtitle: string;
  author?: User;
  icon: ReactNode;
  iconTitle: string;
  colorClass: string;
  phaseOrder?: number;
  phaseStatus?: PracticePhase["status"];
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

function eventIcon(event: PracticeEvent) {
  if (event.type === "call") return { icon: <PhoneCall className="h-4 w-4" />, title: "Telefonata" };
  if (event.type === "mail") return { icon: <Mail className="h-4 w-4" />, title: "Email" };
  return { icon: <TriangleAlert className="h-4 w-4" />, title: "Avviso" };
}

function eventColor(event: PracticeEvent) {
  if (event.type === "call") return "border-l-warning";
  if (event.type === "mail") return "border-l-purple-400";
  return "border-l-danger";
}

function buildEntries(phases: PracticePhase[], events: PracticeEvent[], notes: DemoNote[]) {
  const phaseEntries = phases.map((phase): TimelineEntry => ({
    colorClass: phase.status === "done" ? "border-l-success" : "border-l-electric",
    date: phase.plannedDate || phase.dueDate,
    icon: phase.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />,
    iconTitle: phase.status === "done" ? "Scadenza" : "Scadenza",
    id: phase.id,
    kind: "phase",
    phaseOrder: phase.order,
    phaseStatus: phase.status,
    subtitle: `Fase ${phase.order} del template`,
    title: phase.title,
  }));

  const eventEntries = events.map((event): TimelineEntry => {
    const eventIconData = eventIcon(event);
    return {
      author: event.author,
      colorClass: eventColor(event),
      date: event.occurredAt,
      icon: eventIconData.icon,
      iconTitle: eventIconData.title,
      id: event.id,
      kind: "event",
      subtitle: event.description,
      title: event.title,
    };
  });

  const noteEntries = notes.map((note): TimelineEntry => ({
    author: note.author,
    colorClass: "border-l-purple-400",
    date: noteDate(note),
    icon: <MessageSquareText className="h-4 w-4" />,
    iconTitle: "Nota",
    id: note.id,
    kind: "note",
    subtitle: note.body.length > 80 ? `${note.body.slice(0, 80)}...` : note.body,
    title: `Nota da ${note.author.name}`,
  }));

  return [...phaseEntries, ...eventEntries, ...noteEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function matchesFilter(entry: TimelineEntry, filter: TimelineFilter) {
  if (filter === "all") return true;
  if (filter === "phases") return entry.kind === "phase";
  if (filter === "events") return entry.kind === "event";
  return entry.kind === "note";
}

function noteDate(note: DemoNote) {
  const noteWithOccurredAt = note as DemoNote & { occurredAt?: string | null };
  return noteWithOccurredAt.occurredAt ?? note.createdAt;
}

export function TabTimeline({ events, phases }: TabTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const notes = useDemoStore((state) => state.notes);
  const entries = useMemo(() => buildEntries(phases, events, notes), [events, notes, phases]);
  const visibleEntries = entries.filter((entry) => matchesFilter(entry, filter));

  return (
    <section className="rounded-2xl border border-border bg-surface-low p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="space-y-3">
          {visibleEntries.map((entry) => (
            <Card
              className={cn(
                "border-l-4 bg-surface-container p-4 transition-colors",
                entry.colorClass,
                entry.kind === "note" ? "cursor-pointer hover:bg-surface-high" : "",
              )}
              key={entry.id}
              onClick={() => {
                if (entry.kind !== "note") return;
                document.querySelector<HTMLButtonElement>('button[value="note"]')?.click();
                window.setTimeout(() => document.getElementById(`note-${entry.id}`)?.scrollIntoView({ block: "center" }), 80);
              }}
              role={entry.kind === "note" ? "button" : undefined}
              tabIndex={entry.kind === "note" ? 0 : undefined}
            >
              <div className="flex gap-3">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-low text-electric"
                  title={entry.iconTitle}
                >
                  {entry.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-label text-sm font-semibold text-foreground">{entry.title}</p>
                      <p className="mt-1 text-sm leading-5 text-foreground-variant">{entry.subtitle}</p>
                      {entry.kind === "phase" ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge>Fase {entry.phaseOrder}</Badge>
                          <Badge variant={entry.phaseStatus === "done" ? "success" : "default"}>{entry.phaseStatus}</Badge>
                        </div>
                      ) : null}
                    </div>
                    <Badge className="w-fit shrink-0">
                      {format(new Date(entry.date), "dd MMM yyyy - HH:mm", { locale: it })}
                    </Badge>
                  </div>
                  {entry.author ? (
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
                          avatarClass(entry.author.id),
                        )}
                      >
                        {entry.author.initials}
                      </span>
                      <span className="text-xs text-muted">{entry.author.name}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-container p-10 text-center text-sm text-muted">
          Nessuna attivita registrata
        </div>
      )}
    </section>
  );
}
