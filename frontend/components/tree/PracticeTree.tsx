"use client";

import {
  CalendarDays,
  Maximize2,
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
import { useDemoStore, type DemoNote } from "@/lib/demo-state";
import type { Practice, PracticeEvent, PracticePhase, TreeSelection } from "@/lib/types";

import { BezierEdge } from "./BezierEdge";
import { CommunicationsGroupNode } from "./CommunicationsGroupNode";
import { NodeDrawer } from "./NodeDrawer";
import { NotesGroupNode } from "./NotesGroupNode";
import { PhaseNode } from "./PhaseNode";
import { TimelineDayDrawer, type TimelineDayGroup } from "./TimelineDayDrawer";
import { TodayLine } from "./TodayLine";

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

type CommunicationsCluster = {
  key: string;
  events: PracticeEvent[];
  startDate: string;
  endDate: string;
  x: number;
};

type NotesCluster = {
  key: string;
  notes: DemoNote[];
  startDate: string;
  endDate: string;
  x: number;
};

const PAN_DRAG_THRESHOLD = 5;
const CLUSTER_THRESHOLD_PX = 56;

export function PracticeTree({ practice, phases, events, onSwitchTab, pendingSelection, onTreeSelectionApplied }: PracticeTreeProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; startScrollLeft: number; pointerId: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const [todayDate, setTodayDate] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setTodayDate(new Date());
    setMounted(true);
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
  const [dayDrawer, setDayDrawer] = useState<TimelineDayGroup | null>(null);
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

  const phasePositions = useMemo(() => {
    return new Map(
      orderedPhases.map((phase, index) => {
        const x = dateToTimelineX(phaseTimelineDate(phase, index));
        return [phase.id, { x, y: timeline.y }];
      }),
    );
  }, [dateToTimelineX, orderedPhases, phaseTimelineDate]);

  // Clustering: aggrego comunicazioni la cui distanza in pixel sulla linea
  // sia inferiore a CLUSTER_THRESHOLD_PX. La conversione px→giorni è implicita
  // in dateToTimelineX: px/giorno cambia con la durata della pratica (e con
  // lo zoom in V2), quindi la soglia in giorni si adatta automaticamente.
  const communicationClusters = useMemo<CommunicationsCluster[]>(() => {
    const sorted = events
      .filter((e) => Boolean(e.occurredAt))
      .map((e) => ({ event: e, dateOnly: e.occurredAt.slice(0, 10) }))
      .sort((a, b) => a.dateOnly.localeCompare(b.dateOnly));
    const clusters: CommunicationsCluster[] = [];
    for (const { event, dateOnly } of sorted) {
      const x = dateToTimelineX(dateOnly);
      const last = clusters[clusters.length - 1];
      if (last && Math.abs(x - last.x) < CLUSTER_THRESHOLD_PX) {
        last.events.push(event);
        if (dateOnly > last.endDate) last.endDate = dateOnly;
        if (dateOnly < last.startDate) last.startDate = dateOnly;
        const xs = last.events.map((e) => dateToTimelineX(e.occurredAt.slice(0, 10)));
        last.x = xs.reduce((s, v) => s + v, 0) / xs.length;
      } else {
        clusters.push({
          key: `comm-${dateOnly}-${event.id}`,
          events: [event],
          startDate: dateOnly,
          endDate: dateOnly,
          x,
        });
      }
    }
    return clusters;
  }, [events, dateToTimelineX]);

  const communicationPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    let lastX = -Infinity;
    let lane = 0;
    for (const cluster of communicationClusters) {
      if (cluster.x - lastX < 110) {
        lane = (lane + 1) % 2;
      } else {
        lane = 0;
      }
      map.set(cluster.key, { x: cluster.x, y: lane === 0 ? 132 : 180 });
      lastX = cluster.x;
    }
    return map;
  }, [communicationClusters]);

  const noteClusters = useMemo<NotesCluster[]>(() => {
    if (!mounted) return [];
    const sorted = allNotes
      .filter((n) => !n.phaseId)
      .map((n) => ({ note: n, dateIso: n.occurredAt ?? n.createdAt?.slice(0, 10) ?? "" }))
      .filter(({ dateIso }) => Boolean(dateIso))
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    const clusters: NotesCluster[] = [];
    for (const { note, dateIso } of sorted) {
      const x = dateToTimelineX(dateIso);
      const last = clusters[clusters.length - 1];
      if (last && Math.abs(x - last.x) < CLUSTER_THRESHOLD_PX) {
        last.notes.push(note);
        if (dateIso > last.endDate) last.endDate = dateIso;
        if (dateIso < last.startDate) last.startDate = dateIso;
        const xs = last.notes.map((n) => dateToTimelineX(n.occurredAt ?? n.createdAt?.slice(0, 10) ?? ""));
        last.x = xs.reduce((s, v) => s + v, 0) / xs.length;
      } else {
        clusters.push({
          key: `notes-${dateIso}-${note.id}`,
          notes: [note],
          startDate: dateIso,
          endDate: dateIso,
          x,
        });
      }
    }
    return clusters;
  }, [allNotes, dateToTimelineX, mounted]);

  const notePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    let lastX = -Infinity;
    let lane = 0;
    for (const cluster of noteClusters) {
      if (cluster.x - lastX < 110) {
        lane = (lane + 1) % 2;
      } else {
        lane = 0;
      }
      map.set(cluster.key, { x: cluster.x, y: lane === 0 ? 360 : 312 });
      lastX = cluster.x;
    }
    return map;
  }, [noteClusters]);
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
                {(["call", "mail", "note"] as const).map((tone) => (
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

              {communicationClusters.map((cluster) => {
                const position = communicationPositions.get(cluster.key);
                if (!position) return null;
                const isMulti = cluster.events.length > 1;
                const edgeTone = isMulti ? "note" : cluster.events[0].type;
                return (
                  <BezierEdge
                    fromX={position.x}
                    fromY={timeline.y + (position.y < timeline.y ? -10 : 10)}
                    key={`edge-${cluster.key}`}
                    toX={position.x}
                    toY={position.y + (position.y < timeline.y ? 24 : -24)}
                    arrow
                    tone={edgeTone}
                  />
                );
              })}

              {communicationClusters.map((cluster) => {
                const position = communicationPositions.get(cluster.key);
                if (!position) return null;
                return (
                  <CommunicationsGroupNode
                    endDate={cluster.endDate}
                    events={cluster.events}
                    key={cluster.key}
                    onSelect={() => setDayDrawer({ kind: "communications", startDate: cluster.startDate, endDate: cluster.endDate, items: cluster.events })}
                    startDate={cluster.startDate}
                    timelineY={timeline.y}
                    x={position.x}
                    y={position.y}
                  />
                );
              })}

              {noteClusters.map((cluster) => {
                const position = notePositions.get(cluster.key);
                if (!position) return null;
                return (
                  <BezierEdge
                    arrow
                    fromX={position.x}
                    fromY={timeline.y + (position.y < timeline.y ? -10 : 10)}
                    key={`note-edge-${cluster.key}`}
                    toX={position.x}
                    toY={position.y + (position.y < timeline.y ? 24 : -24)}
                    tone="note"
                  />
                );
              })}

              {noteClusters.map((cluster) => {
                const position = notePositions.get(cluster.key);
                if (!position) return null;
                return (
                  <NotesGroupNode
                    endDate={cluster.endDate}
                    key={cluster.key}
                    notes={cluster.notes}
                    onSelect={() => setDayDrawer({ kind: "notes", startDate: cluster.startDate, endDate: cluster.endDate, items: cluster.notes })}
                    startDate={cluster.startDate}
                    timelineY={timeline.y}
                    x={position.x}
                    y={position.y}
                  />
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

      <TimelineDayDrawer
        group={dayDrawer}
        onOpenChange={(open) => !open && setDayDrawer(null)}
        open={dayDrawer !== null}
      />
    </>
  );
}

