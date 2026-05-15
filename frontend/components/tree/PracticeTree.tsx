"use client";

import {
  AlertTriangle,
  CalendarDays,
  HelpCircle,
  Mail,
  Maximize2,
  MessageSquareText,
  Minus,
  MoveHorizontal,
  PhoneCall,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { V1Hint } from "@/components/ui/v1-hint";
import { useDemoStore } from "@/lib/demo-state";
import type { Practice, PracticeEvent, PracticePhase, TreeSelection } from "@/lib/types";

import { BezierEdge } from "./BezierEdge";
import { EventGroupNode } from "./EventGroupNode";
import { EventNode } from "./EventNode";
import { NodeDrawer } from "./NodeDrawer";
import { PhaseNode } from "./PhaseNode";
import { TodayLine } from "./TodayLine";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type PracticeTreeProps = {
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
  onSwitchTab: (tab: "allegati" | "note") => void;
};

const disabledToolbar = [
  { label: "Riduci zoom", icon: Minus },
  { label: "Aumenta zoom", icon: Plus },
  { label: "Adatta", icon: Maximize2 },
];

const timeline = {
  startX: 120,
  endX: 2060,
  y: 250,
};

const svgWidth = 2200;

type ComposerKind = PracticeEvent["type"] | "note";

type TrunkHover = {
  date: string;
  x: number;
  y: number;
};

type EventGroup = {
  key: string;
  events: PracticeEvent[];
  date: string;
  type: PracticeEvent["type"];
  phase: PracticePhase;
};

const groupTypeLabel = {
  call: "Telefonate",
  mail: "Email",
  warning: "Avvisi",
};

export function PracticeTree({ practice, phases, events, onSwitchTab }: PracticeTreeProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [todayDate, setTodayDate] = useState<Date>(() => new Date("2026-01-01T00:00:00Z"));
  useEffect(() => {
    setTodayDate(new Date());
  }, []);
  const todayIso = useMemo(() => todayDate.toISOString().slice(0, 10), [todayDate]);
  const [selection, setSelection] = useState<TreeSelection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerType, setComposerType] = useState<PracticeEvent["type"] | "note" | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerDescription, setComposerDescription] = useState("");
  const [composerDate, setComposerDate] = useState(todayIso);
  const [composerPhaseId, setComposerPhaseId] = useState<string | null>(null);
  const [trunkHover, setTrunkHover] = useState<TrunkHover | null>(null);
  const [groupSelection, setGroupSelection] = useState<EventGroup | null>(null);
  const activeUser = useDemoStore((state) => state.activeUser);
  const applyAction = useDemoStore((state) => state.applyAction);
  const allNotes = useDemoStore((state) => state.notes);
  const orderedPhases = useMemo(() => [...phases].sort((a, b) => a.order - b.order), [phases]);
  const currentPhase = orderedPhases.find((phase) => phase.status === "in_progress") ?? orderedPhases[0];
  const timelineRange = useMemo(() => {
    const candidates: number[] = [];
    const push = (value: string | Date | undefined) => {
      if (!value) return;
      const t = new Date(value).getTime();
      if (!Number.isNaN(t)) candidates.push(t);
    };
    push(practice.startDate);
    push(practice.dueDate);
    push(todayDate);
    for (const phase of phases) {
      push(phase.plannedDate);
      push(phase.dueDate);
    }
    for (const event of events) {
      push(event.occurredAt);
    }
    if (candidates.length === 0) {
      return { startDate: new Date(practice.startDate), endDate: new Date(practice.dueDate) };
    }
    const padding = 7 * 24 * 60 * 60 * 1000;
    return {
      startDate: new Date(Math.min(...candidates) - padding),
      endDate: new Date(Math.max(...candidates) + padding),
    };
  }, [practice.startDate, practice.dueDate, phases, events, todayDate]);
  const dateToTimelineX = useCallback(
    (value: string | Date) => {
      const date = typeof value === "string" ? new Date(value) : value;
      const duration = Math.max(timelineRange.endDate.getTime() - timelineRange.startDate.getTime(), 1);
      const elapsed = date.getTime() - timelineRange.startDate.getTime();
      const ratio = Math.min(Math.max(elapsed / duration, 0), 1);
      return timeline.startX + ratio * (timeline.endX - timeline.startX);
    },
    [timelineRange.endDate, timelineRange.startDate],
  );
  const todayX = useMemo(() => dateToTimelineX(todayDate), [dateToTimelineX, todayDate]);
  const monthMarkers = useMemo(() => {
    const markers: { date: Date; label: string }[] = [];
    const cursor = new Date(timelineRange.startDate);
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor < timelineRange.endDate) {
      markers.push({
        date: new Date(cursor),
        label: new Intl.DateTimeFormat("it-IT", { month: "long" }).format(cursor),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return markers;
  }, [timelineRange.endDate, timelineRange.startDate]);

  function xToTimelineDate(x: number) {
    const clampedX = Math.min(Math.max(x, timeline.startX), timeline.endX);
    const ratio = (clampedX - timeline.startX) / (timeline.endX - timeline.startX);
    const time =
      timelineRange.startDate.getTime() +
      ratio * (timelineRange.endDate.getTime() - timelineRange.startDate.getTime());
    return new Date(time);
  }

  function isoDate(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  function displayDate(value: string) {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  }

  const phaseTimelineDate = useCallback((phase: PracticePhase, index: number) => {
    const rawDate = phase.plannedDate || phase.dueDate;
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    const denominator = Math.max(orderedPhases.length - 1, 1);
    const ratio = orderedPhases.length > 1 ? index / denominator : 0.5;
    return new Date(
      timelineRange.startDate.getTime() +
        ratio * (timelineRange.endDate.getTime() - timelineRange.startDate.getTime()),
    );
  }, [orderedPhases.length, timelineRange.endDate, timelineRange.startDate]);

  function closestPhaseId(date: string) {
    const target = new Date(date).getTime();
    const closest = orderedPhases.reduce<PracticePhase | null>((best, phase) => {
      if (!best) return phase;
      const bestDistance = Math.abs(phaseTimelineDate(best, orderedPhases.indexOf(best)).getTime() - target);
      const phaseDistance = Math.abs(phaseTimelineDate(phase, orderedPhases.indexOf(phase)).getTime() - target);
      return phaseDistance < bestDistance ? phase : best;
    }, null);
    return closest?.id ?? currentPhase?.id ?? orderedPhases[0]?.id ?? "";
  }

  function resolveEventPhase(event: PracticeEvent) {
    return (
      orderedPhases.find((item) => item.id === event.phaseId) ??
      orderedPhases.find((item) => item.id === closestPhaseId(event.occurredAt))
    );
  }

  const phasePositions = useMemo(() => {
    return new Map(
      orderedPhases.map((phase, index) => {
        const x = dateToTimelineX(phaseTimelineDate(phase, index));
        return [phase.id, { x, y: timeline.y }];
      }),
    );
  }, [dateToTimelineX, orderedPhases, phaseTimelineDate]);

  const noteMarks = useMemo(() => {
    return allNotes
      .map((note, index) => {
        const dateIso = note.occurredAt ?? note.createdAt?.slice(0, 10) ?? "";
        if (!dateIso) return null;
        const above = index % 2 === 0;
        return {
          id: note.id,
          x: dateToTimelineX(dateIso),
          y: above ? 200 : 300,
          body: note.body,
          authorName: note.author.name,
          dateIso,
        };
      })
      .filter((mark): mark is NonNullable<typeof mark> => mark !== null);
  }, [allNotes, dateToTimelineX]);

  const eventGroups = useMemo<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>();
    for (const event of events) {
      const phase =
        orderedPhases.find((item) => item.id === event.phaseId) ?? orderedPhases[0];
      if (!phase) continue;
      const dateOnly = (event.occurredAt ?? "").slice(0, 10);
      if (!dateOnly) continue;
      const key = `${dateOnly}__${event.type}__${phase.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.events.push(event);
      } else {
        map.set(key, { key, events: [event], date: dateOnly, type: event.type, phase });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [events, orderedPhases]);

  const groupPositions = useMemo(
    () =>
      new Map(
        eventGroups.map((group, index) => {
          const above = index % 2 === 0;
          return [group.key, { x: dateToTimelineX(group.date), y: above ? 132 : 360 }];
        }),
      ),
    [dateToTimelineX, eventGroups],
  );
  const freshSelection = useMemo((): TreeSelection | null => {
    if (!selection) return null;
    if (selection.kind === "phase") {
      const phase = orderedPhases.find((item) => item.id === selection.item.id);
      return phase ? { kind: "phase", item: phase } : null;
    }
    const event = events.find((item) => item.id === selection.item.id);
    const phase = orderedPhases.find((item) => item.id === selection.phase.id);
    return event && phase ? { kind: "event", item: event, phase } : null;
  }, [events, orderedPhases, selection]);

  function selectPhase(phase: PracticePhase) {
    setSelection({ kind: "phase", item: phase });
    setDrawerOpen(true);
  }

  function selectEvent(event: PracticeEvent, phase: PracticePhase) {
    setSelection({ kind: "event", item: event, phase });
    setDrawerOpen(true);
  }

  function scrollToTimelineX(x: number) {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    const targetLeft = (x / svgWidth) * scrollArea.scrollWidth - scrollArea.clientWidth / 2;
    scrollArea.scrollTo({ behavior: "smooth", left: Math.max(targetLeft, 0) });
  }

  function openComposer(eventType: ComposerKind, date = todayIso, phaseId = currentPhase?.id) {
    setComposerType(eventType);
    setComposerTitle("");
    setComposerDescription("");
    setComposerDate(date);
    setComposerPhaseId(phaseId ?? null);
  }

  function createEvent() {
    const phaseId = composerPhaseId ?? currentPhase?.id;
    if (!composerType || !phaseId) return;
    if (composerType === "note") {
      if (!composerDescription.trim()) return;
      applyAction({
        type: "add_note",
        body: composerDescription.trim(),
        occurredAt: composerDate,
        phaseId,
      });
    } else {
      if (!composerTitle.trim()) return;
      applyAction({
        type: "create_event",
        description: composerDescription.trim() || "",
        eventType: composerType,
        occurredAt: composerDate,
        phaseId,
        title: composerTitle.trim(),
      });
    }
    setComposerType(null);
  }

  function svgPointFromPointer(event: MouseEvent<SVGLineElement> | PointerEvent<SVGLineElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    return point.matrixTransform(matrix.inverse());
  }

  function handleTrunkPointerMove(event: PointerEvent<SVGLineElement>) {
    const point = svgPointFromPointer(event);
    if (!point) return;
    const clampedX = Math.min(Math.max(point.x, timeline.startX), timeline.endX);
    setTrunkHover({
      date: isoDate(xToTimelineDate(clampedX)),
      x: clampedX,
      y: point.y,
    });
  }

  function handleTrunkClick(event: MouseEvent<SVGLineElement>) {
    if (activeUser.permission === "viewer") return;
    const point = svgPointFromPointer(event);
    if (!point) return;
    const date = isoDate(xToTimelineDate(point.x));
    setComposerDate(date);
    setComposerPhaseId(closestPhaseId(date));
  }

  useEffect(() => {
    scrollToTimelineX(todayX);
  }, [todayX]);

  return (
    <>
      <Card className="overflow-hidden rounded-2xl bg-surface-low/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
                Aggiungi evento
              </p>
              <label className="mt-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted">Data</span>
                <input
                  className="h-9 rounded-xl border border-border bg-surface-container px-3 font-label text-sm font-semibold text-foreground outline-none"
                  onChange={(event) => {
                    setComposerDate(event.target.value);
                    setComposerPhaseId(closestPhaseId(event.target.value));
                  }}
                  title="Imposta la data dell'evento o clicca sul tronco dell'albero"
                  type="date"
                  value={composerDate}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={activeUser.permission === "viewer"}
                onClick={() => openComposer("note", composerDate, composerPhaseId ?? currentPhase?.id)}
                title={activeUser.permission === "viewer" ? "Permesso non disponibile per utente viewer" : "Aggiungi nota all'albero"}
                type="button"
                variant="outline"
              >
                <MessageSquareText className="h-4 w-4" />
                Nota
              </Button>
              <Button
                disabled={activeUser.permission === "viewer"}
                onClick={() => openComposer("call", composerDate, composerPhaseId ?? currentPhase?.id)}
                title={activeUser.permission === "viewer" ? "Permesso non disponibile per utente viewer" : "Aggiungi telefonata"}
                type="button"
                variant="outline"
              >
                <PhoneCall className="h-4 w-4" />
                Telefonata
              </Button>
              <Button
                disabled={activeUser.permission === "viewer"}
                onClick={() => openComposer("mail", composerDate, composerPhaseId ?? currentPhase?.id)}
                title={activeUser.permission === "viewer" ? "Permesso non disponibile per utente viewer" : "Aggiungi email"}
                type="button"
                variant="outline"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => scrollToTimelineX(todayX)} size="sm" title="Centra l'albero sulla data di oggi" type="button" variant="outline">
              <CalendarDays className="h-4 w-4" />
              Oggi
            </Button>
            <Button
              onClick={() => currentPhase && scrollToTimelineX(dateToTimelineX(currentPhase.plannedDate))}
              size="sm"
              title="Centra l'albero sulla fase in corso"
              type="button"
              variant="outline"
            >
              <MoveHorizontal className="h-4 w-4" />
              Fase corrente
            </Button>
            {disabledToolbar.map((item) => {
              const Icon = item.icon;
              return (
                <V1Hint key={item.label} label="Disponibile in V1">
                  <Button
                    aria-label={item.label}
                    className="cursor-not-allowed opacity-50"
                    disabled
                    size="icon"
                    title="Disponibile in V1"
                    type="button"
                    variant="outline"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </V1Hint>
              );
            })}
          </div>
        </div>

        <CardContent className="p-0">
          {composerType ? (
            <div className="border-b border-border bg-surface-container px-5 py-4">
              {composerType === "note" ? (
                <div className="grid gap-3 md:grid-cols-[200px_1fr_auto] md:items-end">
                  <div className="flex flex-col gap-1">
                    <Badge variant="info">
                      <span className="font-display text-sm font-bold uppercase tracking-wide">Nota</span>
                    </Badge>
                    <span className="text-xs text-muted">{displayDate(composerDate)}</span>
                  </div>
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
                    <Button disabled={!composerDescription.trim() || !composerDate} onClick={createEvent} type="button">
                      Salva
                    </Button>
                    <Button onClick={() => setComposerType(null)} type="button" variant="ghost">
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-[200px_1fr_1.4fr_auto] md:items-end">
                  <div className="flex flex-col gap-1">
                    <Badge variant={composerType === "warning" ? "warning" : "info"}>
                      <span className="font-display text-sm font-bold uppercase tracking-wide">
                        {composerType === "call" ? "Telefonata" : composerType === "mail" ? "Email" : "Avviso"}
                      </span>
                    </Badge>
                    <span className="text-xs text-muted">{displayDate(composerDate)}</span>
                  </div>
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
                    <Button disabled={!composerTitle.trim() || !composerDate} onClick={createEvent} type="button">
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
          <div className="overflow-x-auto" ref={scrollAreaRef}>
            <svg
              aria-label="Albero della pratica"
              className="h-[470px] min-w-[2200px] text-foreground"
              role="img"
              viewBox={`0 0 ${svgWidth} 470`}
            >
              <defs>
                <linearGradient id="mainLine" x1="120" x2="2060" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--success)" />
                  <stop offset="50%" stopColor="var(--electric)" />
                  <stop offset="100%" stopColor="var(--on-surface-muted)" stopOpacity="0.45" />
                </linearGradient>
                {(["call", "mail", "warning"] as const).map((tone) => (
                  <marker
                    id={`arrow-${tone}`}
                    key={tone}
                    markerHeight="8"
                    markerWidth="8"
                    orient="auto"
                    refX="7"
                    refY="4"
                    viewBox="0 0 8 8"
                  >
                    <path
                      className={
                        tone === "mail" ? "fill-[#C193FF]" : tone === "warning" ? "fill-warning" : "fill-warning"
                      }
                      d="M 0 0 L 8 4 L 0 8 z"
                    />
                  </marker>
                ))}
              </defs>

              {monthMarkers.map((month) => {
                const x = dateToTimelineX(month.date);
                return (
                  <g key={month.label}>
                    <line
                      className="stroke-electric stroke-[1] opacity-30 [stroke-dasharray:2_8]"
                      x1={x}
                      x2={x}
                      y1="96"
                      y2="418"
                    />
                    <text className="fill-muted text-[10px] font-semibold uppercase tracking-[0.14em]" x={x + 10} y="88">
                      {month.label}
                    </text>
                  </g>
                );
              })}

              <line
                className="stroke-border stroke-[10] opacity-70"
                x1={timeline.startX}
                x2={timeline.endX}
                y1={timeline.y}
                y2={timeline.y}
              />
              <line
                className="stroke-[url(#mainLine)] stroke-[5]"
                x1={timeline.startX}
                x2={timeline.endX}
                y1={timeline.y}
                y2={timeline.y}
              />
              <line
                className="cursor-pointer stroke-transparent stroke-[24]"
                onClick={handleTrunkClick}
                onPointerLeave={() => setTrunkHover(null)}
                onPointerMove={handleTrunkPointerMove}
                x1={timeline.startX}
                x2={timeline.endX}
                y1={timeline.y}
                y2={timeline.y}
              />
              {trunkHover ? (
                <g pointerEvents="none" transform={`translate(${trunkHover.x} ${Math.max(54, trunkHover.y - 54)})`}>
                  <rect className="fill-surface-high stroke-border" height="32" rx="10" width="134" x="-67" y="-24" />
                  <text className="fill-foreground text-[11px] font-semibold" textAnchor="middle" y="-4">
                    {displayDate(trunkHover.date)}
                  </text>
                </g>
              ) : null}
              <TodayLine x={todayX} />

              {eventGroups.map((group) => {
                const position = groupPositions.get(group.key);
                if (!position) return null;
                return (
                  <BezierEdge
                    fromX={position.x}
                    fromY={timeline.y + (position.y < timeline.y ? -10 : 10)}
                    key={`edge-${group.key}`}
                    toX={position.x}
                    toY={position.y + (position.y < timeline.y ? 24 : -24)}
                    arrow
                    tone={group.type}
                  />
                );
              })}

              {eventGroups.map((group) => {
                const position = groupPositions.get(group.key);
                if (!position) return null;
                if (group.events.length > 1) {
                  return (
                    <EventGroupNode
                      count={group.events.length}
                      date={group.date}
                      key={group.key}
                      onSelect={() => setGroupSelection(group)}
                      timelineY={timeline.y}
                      type={group.type}
                      x={position.x}
                      y={position.y}
                    />
                  );
                }
                const event = group.events[0];
                return (
                  <EventNode
                    event={event}
                    key={group.key}
                    onSelect={selectEvent}
                    phase={group.phase}
                    timelineY={timeline.y}
                    x={position.x}
                    y={position.y}
                  />
                );
              })}

              {noteMarks.map((mark) => (
                <g
                  aria-label={`Nota di ${mark.authorName}`}
                  className="cursor-pointer group"
                  key={`note-${mark.id}`}
                  onClick={() => onSwitchTab("note")}
                  role="button"
                  tabIndex={0}
                  transform={`translate(${mark.x} 290)`}
                >
                  <title>{`Nota — ${mark.authorName} — ${displayDate(mark.dateIso)}\n${mark.body.slice(0, 120)}`}</title>
                  <circle className="fill-electric/20 stroke-electric/50 stroke-[1.5] transition-colors group-hover:fill-electric/40 group-hover:stroke-electric" r="6" />
                  <circle className="fill-electric" r="2.5" />
                </g>
              ))}

              {orderedPhases.map((phase) => {
                const position = phasePositions.get(phase.id);
                if (!position) return null;
                return (
                  <PhaseNode
                    key={phase.id}
                    onSelect={selectPhase}
                    phase={phase}
                    selected={selection?.kind === "phase" && selection.item.id === phase.id}
                    totalPhases={orderedPhases.length}
                    x={position.x}
                    y={position.y}
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-muted">
            <span>{orderedPhases.filter((phase) => phase.status === "done").length} fasi completate</span>
            <span>{events.length} eventi collegati</span>
          </div>
          <TreeHelpBox />
        </CardContent>
      </Card>

      <NodeDrawer onOpenChange={setDrawerOpen} onSwitchTab={onSwitchTab} open={drawerOpen} selection={freshSelection} />

      <Sheet onOpenChange={(open) => !open && setGroupSelection(null)} open={groupSelection !== null}>
        <SheetContent>
          {groupSelection ? (
            <>
              <SheetHeader>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
                  {groupTypeLabel[groupSelection.type]} - Fase {groupSelection.phase.order}
                </p>
                <SheetTitle>
                  {groupSelection.events.length} {groupTypeLabel[groupSelection.type].toLowerCase()} il{" "}
                  {displayDate(groupSelection.date)}
                </SheetTitle>
                <SheetDescription>
                  Clicca su una voce per aprirne il dettaglio.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
                {[...groupSelection.events]
                  .sort((a, b) => (a.occurredAt ?? "").localeCompare(b.occurredAt ?? ""))
                  .map((event) => (
                    <button
                      className="flex flex-col gap-1 rounded-xl border border-border bg-surface-container px-4 py-3 text-left transition-colors hover:border-electric/40 hover:bg-surface-high"
                      key={event.id}
                      onClick={() => {
                        selectEvent(event, groupSelection.phase);
                        setGroupSelection(null);
                      }}
                      type="button"
                    >
                      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                        {event.author.name}
                      </span>
                      <span className="font-label text-sm font-semibold text-foreground">
                        {event.title}
                      </span>
                      {event.description ? (
                        <span className="line-clamp-2 text-xs text-muted">{event.description}</span>
                      ) : null}
                    </button>
                  ))}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

const TREE_HELP_STORAGE_KEY = "epractice:tree_help_visible";

function TreeHelpBox() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(TREE_HELP_STORAGE_KEY);
    setVisible(raw === null ? true : raw === "true");
  }, []);

  function close() {
    setVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TREE_HELP_STORAGE_KEY, "false");
    }
  }

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 border-t border-border bg-surface-container px-5 py-4 text-sm text-foreground-variant">
      <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-electric" />
      <div className="flex-1 space-y-3 leading-6">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
            Come leggere l&apos;albero
          </p>
          <ul className="mt-1 space-y-0.5">
            <li>
              <strong className="text-foreground">Cerchi grandi numerati</strong> sul tronco = fasi del template (pietre miliari).
            </li>
            <li>
              <strong className="text-foreground">Icone sopra e sotto</strong> = eventi sulla fase: telefonate, email.
            </li>
            <li>
              <strong className="text-foreground">Puntini electric sotto il tronco</strong> = note registrate sulla pratica.
            </li>
          </ul>
        </div>
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
            Aggiungere un evento
          </p>
          <p className="mt-1">
            Click sul tronco per scegliere la data, poi sul bottone <strong className="text-foreground">Nota / Telefonata / Email</strong> in alto.
            Click su un cerchio o su un&apos;icona per aprire il dettaglio nella sidebar destra; i puntini elettric sotto il tronco sono le note (click apre il tab Note).
          </p>
        </div>
      </div>
      <button
        aria-label="Nascondi la guida"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-high hover:text-foreground"
        onClick={close}
        title="Nascondi guida (la riattivi dalle impostazioni)"
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
