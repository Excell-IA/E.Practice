"use client";

import { format, isAfter, isSameDay, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle2, Mail, MessageSquareText, PhoneCall, PlayCircle, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  badgeLabel: string;
  badgeVariant: "default" | "info" | "success" | "warning" | "danger";
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

function noteDate(note: DemoNote) {
  const noteWithOccurredAt = note as DemoNote & { occurredAt?: string | null };
  return noteWithOccurredAt.occurredAt ?? note.createdAt;
}

function buildEntries(phases: PracticePhase[], events: PracticeEvent[], notes: DemoNote[]) {
  const phaseEntries = phases.map((phase): TimelineEntry => ({
    colorClass: phase.status === "done" ? "border-l-success" : "border-l-electric",
    badgeLabel: "FASE",
    badgeVariant: "info",
    date: phase.plannedDate || phase.dueDate,
    icon: phase.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />,
    iconTitle: phase.status === "done" ? "Fase completata" : "Fase del template",
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
      badgeLabel: eventIconData.title.toUpperCase(),
      badgeVariant: event.type === "mail" ? "info" : event.type === "call" ? "warning" : "danger",
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
    badgeLabel: "NOTA",
    badgeVariant: "default",
    colorClass: "border-l-purple-400",
    date: noteDate(note),
    icon: <MessageSquareText className="h-4 w-4" />,
    iconTitle: "Nota",
    id: note.id,
    kind: "note",
    subtitle: note.body.length > 80 ? `${note.body.slice(0, 80)}...` : note.body,
    title: `Nota da ${note.author.name}`,
  }));

  return [...phaseEntries, ...eventEntries, ...noteEntries];
}

function matchesFilter(entry: TimelineEntry, filter: TimelineFilter) {
  if (filter === "all") return true;
  if (filter === "phases") return entry.kind === "phase";
  if (filter === "events") return entry.kind === "event";
  return entry.kind === "note";
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

  const todayDate = startOfDay(new Date());

  // Anchor: l'entry più recente fino a oggi compreso (default focus)
  const anchorId = useMemo(() => {
    let anchor: TimelineEntry | null = null;
    for (const entry of visibleEntries) {
      const d = new Date(entry.date);
      if (!isAfter(startOfDay(d), todayDate)) {
        anchor = entry;
      }
    }
    return anchor?.id ?? null;
  }, [visibleEntries, todayDate]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollContainerRef.current || !anchorRef.current) return;
    const container = scrollContainerRef.current;
    const anchor = anchorRef.current;
    const offset = anchor.offsetTop - container.offsetTop - 12;
    container.scrollTop = offset > 0 ? offset : 0;
  }, [anchorId, filter]);

  function cardClass(entry: TimelineEntry) {
    const date = startOfDay(new Date(entry.date));
    if (isSameDay(date, todayDate)) return "border-electric/60 bg-electric/10";
    if (isAfter(date, todayDate)) return "border-dashed border-muted/40 bg-surface-high";
    return "bg-surface-container";
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface-low p-5">
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
        <div className="space-y-2 lg:flex-1 lg:overflow-y-auto lg:pr-1" ref={scrollContainerRef}>
          {visibleEntries.map((entry) => (
            <div key={entry.id} ref={entry.id === anchorId ? anchorRef : undefined}>
              <Card
                className={cn(
                  "cursor-pointer border-l-4 px-3 py-2 transition-colors hover:bg-surface-high",
                  cardClass(entry),
                  entry.colorClass,
                )}
                onClick={() => {
                  if (entry.kind === "note") {
                    onSwitchTab?.("note");
                    window.setTimeout(() => document.getElementById(`note-${entry.id}`)?.scrollIntoView({ block: "center" }), 120);
                  } else if (onRequestTreeSelect) {
                    onRequestTreeSelect(entry.kind, entry.id);
                  } else {
                    onSwitchTab?.("albero");
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-low text-electric"
                    title={entry.iconTitle}
                  >
                    {entry.icon}
                  </div>
                  <Badge className="shrink-0" variant={entry.badgeVariant}>
                    {entry.badgeLabel}
                  </Badge>
                  <span className="min-w-0 truncate font-label text-sm font-semibold text-foreground">
                    {entry.title}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-xs text-foreground-variant">·</span>
                  <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-foreground-variant">
                    {format(new Date(entry.date), "dd MMM · HH:mm", { locale: it })}
                  </span>
                  {entry.author ? (
                    <>
                      <span aria-hidden="true" className="hidden shrink-0 text-xs text-foreground-variant sm:inline">·</span>
                      <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full font-display text-[9px] font-bold text-white",
                            avatarClass(entry.author.id),
                          )}
                        >
                          {entry.author.initials}
                        </span>
                        <span className="whitespace-nowrap text-xs text-foreground-variant">{entry.author.name}</span>
                      </span>
                    </>
                  ) : null}
                  {entry.kind === "phase" && entry.phaseStatus ? (
                    <>
                      <span aria-hidden="true" className="hidden shrink-0 text-xs text-foreground-variant sm:inline">·</span>
                      <span className="hidden shrink-0 whitespace-nowrap text-xs text-muted sm:inline">
                        Fase {entry.phaseOrder} · {phaseStatusLabel[entry.phaseStatus]}
                      </span>
                    </>
                  ) : null}
                  {entry.subtitle ? (
                    <>
                      <span aria-hidden="true" className="hidden shrink-0 text-xs text-foreground-variant md:inline">·</span>
                      <span className="hidden min-w-0 flex-1 truncate text-xs text-muted md:inline">{entry.subtitle}</span>
                    </>
                  ) : null}
                </div>
              </Card>
            </div>
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
