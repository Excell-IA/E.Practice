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
  kind: "phase_start" | "phase_done" | "event" | "note";
  date: string;
  title: string;
  subtitle: string;
  author?: User;
  icon: ReactNode;
  colorClass: string;
};

const filters: { label: string; value: TimelineFilter }[] = [
  { label: "Tutti", value: "all" },
  { label: "Fasi", value: "phases" },
  { label: "Eventi", value: "events" },
  { label: "Note", value: "notes" },
];

function avatarClass(userId?: string) {
  if (userId?.endsWith("0001")) return "bg-[#14532d]";
  if (userId?.endsWith("0002")) return "bg-[#0f766e]";
  if (userId?.endsWith("0003")) return "bg-[#ea580c]";
  return "bg-[#6b7280]";
}

function eventIcon(event: PracticeEvent) {
  if (event.type === "call") return <PhoneCall className="h-4 w-4" />;
  if (event.type === "mail") return <Mail className="h-4 w-4" />;
  return <TriangleAlert className="h-4 w-4" />;
}

function eventColor(event: PracticeEvent) {
  if (event.type === "call") return "border-l-warning";
  if (event.type === "mail") return "border-l-purple-400";
  return "border-l-danger";
}

function buildEntries(phases: PracticePhase[], events: PracticeEvent[], notes: DemoNote[]) {
  const phaseEntries = phases.flatMap((phase): TimelineEntry[] => {
    const entries: TimelineEntry[] = [];
    if (phase.status !== "pending") {
      entries.push({
        colorClass: "border-l-electric",
        date: phase.plannedDate,
        icon: <PlayCircle className="h-4 w-4" />,
        id: `${phase.id}-start`,
        kind: "phase_start",
        subtitle: "Avvio fase",
        title: phase.title,
      });
    }
    if (phase.status === "done") {
      entries.push({
        colorClass: "border-l-success",
        date: phase.dueDate,
        icon: <CheckCircle2 className="h-4 w-4" />,
        id: `${phase.id}-done`,
        kind: "phase_done",
        subtitle: "Fase completata",
        title: phase.title,
      });
    }
    return entries;
  });

  const eventEntries = events.map((event): TimelineEntry => ({
    author: event.author,
    colorClass: eventColor(event),
    date: event.occurredAt,
    icon: eventIcon(event),
    id: event.id,
    kind: "event",
    subtitle: event.description,
    title: event.title,
  }));

  const noteEntries = notes.map((note): TimelineEntry => ({
    author: note.author,
    colorClass: "border-l-purple-400",
    date: note.createdAt,
    icon: <MessageSquareText className="h-4 w-4" />,
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
  if (filter === "phases") return entry.kind === "phase_start" || entry.kind === "phase_done";
  if (filter === "events") return entry.kind === "event";
  return entry.kind === "note";
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
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === item.value
                  ? "border-electric bg-electric/10 text-electric"
                  : "border-border bg-surface-container text-muted hover:text-foreground",
              )}
              key={item.value}
              onClick={() => setFilter(item.value)}
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
            <Card className={cn("border-l-4 bg-surface-container p-4", entry.colorClass)} key={entry.id}>
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-low text-electric">
                  {entry.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-label text-sm font-semibold text-foreground">{entry.title}</p>
                      <p className="mt-1 text-sm leading-5 text-foreground-variant">{entry.subtitle}</p>
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
