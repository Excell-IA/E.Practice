"use client";

import {
  AlertTriangle,
  CalendarDays,
  Maximize2,
  MessageSquareText,
  Minus,
  MoveHorizontal,
  Plus,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import { EventComposer } from "@/components/practice/EventComposer";
import { HelpButton } from "@/components/ui/help-button";

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
  pendingSelection?: { kind: "phase" | "event"; id: string } | null;
  onTreeSelectionApplied?: () => void;
  onRequestNoteFocus?: (noteId: string) => void;
};

const disabledToolbar = [
  { label: "Riduci zoom", icon: Minus },
  { label: "Aumenta zoom", icon: Plus },
  { label: "Adatta", icon: Maximize2 },
];

const timeline = {
  startX: 140,
  endX: 3060,
  y: 250,
};

const svgWidth = 3200;

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

const PAN_DRAG_THRESHOLD = 5;

export function PracticeTree({ practice, phases, events, onSwitchTab, pendingSelection, onTreeSelectionApplied, onRequestNoteFocus }: PracticeTreeProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; startScrollLeft: number; pointerId: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const [todayDate, setTodayDate] = useState<Date>(() => new Date());
  useEffect(() => {
    setTodayDate(new Date());
  }, []);
  const todayIso = useMemo(() => {
    const local = new Date(todayDate.getTime() - todayDate.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, [todayDate]);
  const [selection, setSelection] = useState<TreeSelection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState(todayIso);

  useEffect(() => {
    setComposerDate((current) => (current === "" || current === todayIso ? todayIso : current));
  }, [todayIso]);
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
  const todayX = useMemo(() => {
    const startOfDay = new Date(todayDate);
    startOfDay.setHours(0, 0, 0, 0);
    return dateToTimelineX(startOfDay);
  }, [dateToTimelineX, todayDate]);
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
    const items = allNotes
      .filter((note) => !note.phaseId)
      .map((note) => {
        const dateIso = note.occurredAt ?? note.createdAt?.slice(0, 10) ?? "";
        if (!dateIso) return null;
        return {
          id: note.id,
          x: dateToTimelineX(dateIso),
          body: note.body,
          authorName: note.author.name,
          dateIso,
        };
      })
      .filter((mark): mark is NonNullable<typeof mark> => mark !== null)
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    let lastX = -Infinity;
    let lane = 0;
    return items.map((mark) => {
      if (mark.x - lastX < 110) {
        lane = (lane + 1) % 2;
      } else {
        lane = 0;
      }
      lastX = mark.x;
      return { ...mark, y: lane === 0 ? 360 : 312 };
    });
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

  const groupPositions = useMemo(() => {
    const sorted = [...eventGroups].sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, { x: number; y: number }>();
    let lastX = -Infinity;
    let lane = 0;
    for (const group of sorted) {
      const x = dateToTimelineX(group.date);
      if (x - lastX < 110) {
        lane = (lane + 1) % 2;
      } else {
        lane = 0;
      }
      map.set(group.key, { x, y: lane === 0 ? 132 : 180 });
      lastX = x;
    }
    return map;
  }, [dateToTimelineX, eventGroups]);
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

  useEffect(() => {
    if (!pendingSelection) return;
    if (pendingSelection.kind === "phase") {
      const phase = orderedPhases.find((item) => item.id === pendingSelection.id);
      if (phase) {
        setSelection({ kind: "phase", item: phase });
        setDrawerOpen(true);
        onTreeSelectionApplied?.();
      }
    } else {
      const event = events.find((item) => item.id === pendingSelection.id);
      const phase = event ? orderedPhases.find((item) => item.id === event.phaseId) ?? orderedPhases[0] : null;
      if (event && phase) {
        setSelection({ kind: "event", item: event, phase });
        setDrawerOpen(true);
        onTreeSelectionApplied?.();
      }
    }
  }, [pendingSelection, orderedPhases, events, onTreeSelectionApplied]);

  function scrollToTimelineX(x: number) {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    const targetLeft = (x / svgWidth) * scrollArea.scrollWidth - scrollArea.clientWidth / 2;
    scrollArea.scrollTo({ behavior: "smooth", left: Math.max(targetLeft, 0) });
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
    if (hasDraggedRef.current) return;
    if (activeUser.permission === "viewer") return;
    const point = svgPointFromPointer(event);
    if (!point) return;
    const date = isoDate(xToTimelineDate(point.x));
    setComposerDate(date);
    setComposerPhaseId(closestPhaseId(date));
  }

  function onPanStart(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    panState.current = {
      startX: event.clientX,
      startScrollLeft: scrollArea.scrollLeft,
      pointerId: event.pointerId,
    };
    hasDraggedRef.current = false;
  }

  function onPanMove(event: PointerEvent<HTMLDivElement>) {
    const state = panState.current;
    const scrollArea = scrollAreaRef.current;
    if (!state || !scrollArea) return;
    const dx = event.clientX - state.startX;
    if (!hasDraggedRef.current) {
      if (Math.abs(dx) < PAN_DRAG_THRESHOLD) return;
      hasDraggedRef.current = true;
      try {
        scrollArea.setPointerCapture(state.pointerId);
      } catch {}
      scrollArea.style.cursor = "grabbing";
    }
    scrollArea.scrollLeft = state.startScrollLeft - dx;
  }

  function onPanEnd(event: PointerEvent<HTMLDivElement>) {
    const state = panState.current;
    const scrollArea = scrollAreaRef.current;
    if (state && scrollArea && hasDraggedRef.current) {
      try {
        scrollArea.releasePointerCapture(state.pointerId);
      } catch {}
      scrollArea.style.cursor = "";
    }
    panState.current = null;
    if (hasDraggedRef.current) {
      window.setTimeout(() => {
        hasDraggedRef.current = false;
      }, 0);
    }
  }

  useEffect(() => {
    scrollToTimelineX(todayX);
  }, [todayX]);

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface-low/90 p-10 text-center md:hidden">
        <Smartphone className="h-16 w-16 -rotate-90 text-electric" />
        <div>
          <p className="font-display text-lg font-semibold text-foreground">Ruota il telefono</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            L&apos;albero della pratica è ottimizzato per la visualizzazione in orizzontale
          </p>
        </div>
      </div>

      <Card className="hidden overflow-hidden rounded-2xl bg-surface-low/90 md:block">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <EventComposer
            controlledDate={composerDate}
            controlledPhaseId={composerPhaseId}
            currentPhase={currentPhase}
            onControlledDateChange={(next) => {
              setComposerDate(next);
              setComposerPhaseId(closestPhaseId(next));
            }}
            onControlledPhaseIdChange={setComposerPhaseId}
            phases={phases}
          />
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
            <HelpButton title="Come funziona la vista albero" subtitle="Linea del tempo + eventi + note">
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Come si legge</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li><strong className="text-foreground">Tronco orizzontale</strong>: asse del tempo della pratica.</li>
                  <li><strong className="text-foreground">Cerchi numerati</strong> sul tronco: fasi del template, ognuna con la sua data e il suo assegnatario.</li>
                  <li><strong className="text-foreground">Icone sopra</strong> il tronco: eventi (telefonate, email) agganciati alla fase più vicina.</li>
                  <li><strong className="text-foreground">Puntini electric sotto</strong>: note libere registrate sulla data scelta.</li>
                </ul>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Aggiungere qualcosa</p>
                <p className="mt-2">
                  Imposta la <strong className="text-foreground">Data</strong> nel toolbar (o click sul tronco), poi scegli il tipo: <strong className="text-foreground">Nota</strong>, <strong className="text-foreground">Telefonata</strong> o <strong className="text-foreground">Email</strong>. Compila titolo/testo e Crea.
                </p>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Modificare</p>
                <p className="mt-2">
                  Click su una fase o un evento → si apre la sidebar destra. Stato, assegnatario, data e note si salvano automaticamente; l&apos;evento ha un bottone Salva.
                </p>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Più eventi nello stesso giorno</p>
                <p className="mt-2">
                  Eventi dello stesso tipo, stessa fase e stesso giorno vengono raggruppati in un nodo con il contatore. Click → drawer storico con la lista cronologica.
                </p>
              </section>
            </HelpButton>
          </div>
        </div>

        <CardContent className="p-0">
          <div
            className="tree-scroll cursor-grab overflow-x-auto select-none touch-pan-y"
            onPointerCancel={onPanEnd}
            onPointerDown={onPanStart}
            onPointerMove={onPanMove}
            onPointerUp={onPanEnd}
            ref={scrollAreaRef}
          >
            <svg
              aria-label="Albero della pratica"
              className="h-[470px] min-w-[3200px] text-foreground"
              role="img"
              viewBox={`0 0 ${svgWidth} 470`}
            >
              <defs>
                <linearGradient id="mainLine" x1="140" x2="3060" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--success)" />
                  <stop offset="50%" stopColor="var(--electric)" />
                  <stop offset="100%" stopColor="var(--on-surface-muted)" stopOpacity="0.45" />
                </linearGradient>
                {(["call", "mail", "warning", "note"] as const).map((tone) => (
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
                        tone === "mail"
                          ? "fill-[#C193FF]"
                          : tone === "note"
                            ? "fill-electric"
                            : tone === "warning"
                              ? "fill-warning"
                              : "fill-warning"
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
                      y1="64"
                      y2="418"
                    />
                    <text className="fill-muted text-[10px] font-semibold uppercase tracking-[0.14em]" x={x + 10} y="56">
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
                <BezierEdge
                  arrow
                  fromX={mark.x}
                  fromY={timeline.y + (mark.y < timeline.y ? -10 : 10)}
                  key={`note-edge-${mark.id}`}
                  toX={mark.x}
                  toY={mark.y + (mark.y < timeline.y ? 24 : -24)}
                  tone="note"
                />
              ))}

              {noteMarks.map((mark) => {
                const labelY = mark.y < timeline.y ? -40 : 54;
                const noteDate = new Intl.DateTimeFormat("it-IT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(mark.dateIso));
                const dateChipY = mark.y < timeline.y ? timeline.y + 30 : timeline.y - 24;
                const preview = mark.body.length > 18 ? `${mark.body.slice(0, 18)}…` : mark.body;
                return (
                  <g
                    aria-label={`Nota di ${mark.authorName}`}
                    className="group cursor-pointer"
                    key={`note-${mark.id}`}
                    onClick={() => {
                      if (onRequestNoteFocus) onRequestNoteFocus(mark.id);
                      else onSwitchTab("note");
                    }}
                    role="button"
                    tabIndex={0}
                    transform={`translate(${mark.x} 0)`}
                  >
                    <title>{`Nota — ${mark.authorName} — ${noteDate}\n${mark.body.slice(0, 120)}`}</title>
                    <circle className="fill-transparent" cy={timeline.y} r="22" />
                    <circle className="fill-electric/10 stroke-electric/20 stroke-2 transition-colors group-hover:fill-electric/20 group-hover:stroke-electric/50" cy={timeline.y} r="16" />
                    <circle className="fill-surface-high stroke-electric stroke-2" cy={timeline.y} r="10" />
                    <circle className="fill-electric" cy={timeline.y} r="4" />
                    <g className="opacity-0 transition-opacity group-hover:opacity-100">
                      <rect className="fill-surface-high stroke-border" height="50" rx="12" width="164" x="-82" y={dateChipY - 30} />
                      <text className="fill-electric text-[10px] font-semibold uppercase tracking-wider" textAnchor="middle" y={dateChipY - 16}>NOTA</text>
                      <text className="fill-foreground text-[11px] font-semibold" textAnchor="middle" y={dateChipY - 1}>{noteDate}</text>
                      <text className="fill-muted text-[10px] font-semibold" textAnchor="middle" y={dateChipY + 13}>{mark.authorName}</text>
                    </g>
                    <g transform={`translate(0 ${mark.y})`}>
                      <circle className="fill-none stroke-electric/0 stroke-2 transition-colors group-hover:stroke-electric/45" r="22" />
                      <circle className="fill-electric/10 stroke-electric stroke-[1.5]" r="18" />
                      <foreignObject height="20" width="20" x="-10" y="-10">
                        <div className="flex h-5 w-5 items-center justify-center text-foreground">
                          <MessageSquareText className="h-4 w-4" />
                        </div>
                      </foreignObject>
                      <rect className="fill-surface-container" height="22" rx="11" width="104" x="-52" y={labelY - 15} />
                      <text className="fill-muted text-[11px] font-semibold" textAnchor="middle" y={labelY}>{preview}</text>
                    </g>
                  </g>
                );
              })}

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

