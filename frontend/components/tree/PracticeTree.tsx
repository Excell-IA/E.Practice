"use client";

import {
  AlertTriangle,
  CalendarDays,
  Mail,
  Maximize2,
  MessageSquareText,
  Minus,
  MoveHorizontal,
  PhoneCall,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { V1Hint } from "@/components/ui/v1-hint";
import { useDemoStore } from "@/lib/demo-state";
import type { Practice, PracticeEvent, PracticePhase, TreeSelection } from "@/lib/types";

import { BezierEdge } from "./BezierEdge";
import { EventNode } from "./EventNode";
import { NodeDrawer } from "./NodeDrawer";
import { PhaseNode } from "./PhaseNode";
import { TodayLine } from "./TodayLine";

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

type TrunkDraft = {
  date: string;
  phaseId: string;
};

export function PracticeTree({ practice, phases, events, onSwitchTab }: PracticeTreeProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [todayDate] = useState<Date>(() => new Date());
  const todayIso = useMemo(() => todayDate.toISOString().slice(0, 10), [todayDate]);
  const [selection, setSelection] = useState<TreeSelection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerType, setComposerType] = useState<PracticeEvent["type"] | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerDescription, setComposerDescription] = useState("");
  const [composerDate, setComposerDate] = useState(todayIso);
  const [composerPhaseId, setComposerPhaseId] = useState<string | null>(null);
  const [trunkHover, setTrunkHover] = useState<TrunkHover | null>(null);
  const [trunkDraft, setTrunkDraft] = useState<TrunkDraft | null>(null);
  const activeUser = useDemoStore((state) => state.activeUser);
  const applyAction = useDemoStore((state) => state.applyAction);
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
    let previousX = timeline.startX;
    return new Map(
      orderedPhases.map((phase, index) => {
        const dateX = dateToTimelineX(phaseTimelineDate(phase, index));
        const x = index === 0 ? dateX : Math.max(dateX, previousX + 175);
        previousX = x;
        return [phase.id, { x, y: timeline.y }];
      }),
    );
  }, [dateToTimelineX, orderedPhases, phaseTimelineDate]);

  const eventPositions = useMemo(
    () =>
      new Map(
        events.map((event, index) => {
          const above = index % 2 === 0;
          return [event.id, { x: dateToTimelineX(event.occurredAt), y: above ? 132 : 360 }];
        }),
      ),
    [dateToTimelineX, events],
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
    const mappedType: PracticeEvent["type"] = eventType === "note" ? "warning" : eventType;
    const defaultTitle =
      eventType === "note"
        ? "Nota operativa"
        : eventType === "call"
          ? "Telefonata cliente"
          : eventType === "mail"
            ? "Email integrativa"
            : "Alert scadenza";
    setComposerType(mappedType);
    setComposerTitle(defaultTitle);
    setComposerDescription("");
    setComposerDate(date);
    setComposerPhaseId(phaseId ?? null);
    setTrunkDraft(null);
  }

  function createEvent() {
    const phaseId = composerPhaseId ?? currentPhase?.id;
    if (!composerType || !composerTitle.trim() || !phaseId) return;
    applyAction({
      type: "create_event",
      description: composerDescription.trim() || "Evento demo creato durante walkthrough.",
      eventType: composerType,
      occurredAt: composerDate,
      phaseId,
      title: composerTitle.trim(),
    });
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
    setTrunkDraft({ date, phaseId: closestPhaseId(date) });
    setComposerType(null);
  }

  useEffect(() => {
    scrollToTimelineX(todayX);
  }, [todayX]);

  return (
    <>
      <Card className="overflow-hidden rounded-2xl bg-surface-low/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Vista albero
            </p>
            <h2 className="font-display text-xl font-semibold text-foreground">{practice.title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => scrollToTimelineX(todayX)} size="sm" title="Centra su oggi" type="button" variant="outline">
              <CalendarDays className="h-4 w-4" />
              Oggi
            </Button>
            <Button
              onClick={() => currentPhase && scrollToTimelineX(dateToTimelineX(currentPhase.plannedDate))}
              size="sm"
              title="Centra sulla fase corrente"
              type="button"
              variant="outline"
            >
              <MoveHorizontal className="h-4 w-4" />
              Fase corrente
            </Button>
            <Button
              disabled={activeUser.permission === "viewer"}
              onClick={() => openComposer("call")}
              size="sm"
              title={activeUser.permission === "viewer" ? "Permesso non disponibile per utente viewer" : "Crea telefonata demo"}
              type="button"
              variant="outline"
            >
              <PhoneCall className="h-4 w-4" />
              Telefonata
            </Button>
            <Button
              disabled={activeUser.permission === "viewer"}
              onClick={() => openComposer("mail")}
              size="sm"
              title={activeUser.permission === "viewer" ? "Permesso non disponibile per utente viewer" : "Crea mail demo"}
              type="button"
              variant="outline"
            >
              <Mail className="h-4 w-4" />
              Mail
            </Button>
            <Button
              disabled={activeUser.permission === "viewer"}
              onClick={() => openComposer("warning")}
              size="sm"
              title={activeUser.permission === "viewer" ? "Permesso non disponibile per utente viewer" : "Crea alert scadenza"}
              type="button"
              variant="warning"
            >
              <AlertTriangle className="h-4 w-4" />
              Alert
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
              <div className="grid gap-3 md:grid-cols-[180px_1fr_1.4fr_auto] md:items-end">
                <div>
                  <p className="mb-1 text-xs text-muted">Tipo evento</p>
                  <Badge variant={composerType === "warning" ? "warning" : "info"}>{composerType}</Badge>
                </div>
                <label className="text-sm text-muted">
                  Titolo
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-foreground outline-none"
                    onChange={(event) => setComposerTitle(event.target.value)}
                    value={composerTitle}
                  />
                </label>
                <label className="text-sm text-muted">
                  Descrizione
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-foreground outline-none"
                    onChange={(event) => setComposerDescription(event.target.value)}
                    placeholder={`Collegato a ${currentPhase?.title ?? "fase corrente"}`}
                    value={composerDescription}
                  />
                </label>
                <div className="flex gap-2">
                  <Button disabled={!composerTitle.trim()} onClick={createEvent} type="button">
                    Crea
                  </Button>
                  <Button onClick={() => setComposerType(null)} type="button" variant="ghost">
                    Annulla
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {trunkDraft && !composerType ? (
            <div className="border-b border-border bg-surface-container px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
                    Aggiungi evento
                  </p>
                  <p className="text-sm font-semibold text-foreground">In data {displayDate(trunkDraft.date)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openComposer("note", trunkDraft.date, trunkDraft.phaseId)} size="sm" type="button" variant="outline">
                    <MessageSquareText className="h-4 w-4" />
                    Nota
                  </Button>
                  <Button onClick={() => openComposer("call", trunkDraft.date, trunkDraft.phaseId)} size="sm" type="button" variant="outline">
                    <PhoneCall className="h-4 w-4" />
                    Telefonata
                  </Button>
                  <Button onClick={() => openComposer("mail", trunkDraft.date, trunkDraft.phaseId)} size="sm" type="button" variant="outline">
                    <Mail className="h-4 w-4" />
                    Mail
                  </Button>
                  <Button onClick={() => openComposer("warning", trunkDraft.date, trunkDraft.phaseId)} size="sm" type="button" variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    Alert
                  </Button>
                  <Button onClick={() => setTrunkDraft(null)} size="sm" type="button" variant="ghost">
                    Annulla
                  </Button>
                </div>
              </div>
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

              {events.map((event) => {
                const phase = resolveEventPhase(event);
                const eventPosition = eventPositions.get(event.id);
                if (!phase || !eventPosition) return null;
                return (
                  <BezierEdge
                    fromX={eventPosition.x}
                    fromY={timeline.y + (eventPosition.y < timeline.y ? -10 : 10)}
                    key={`edge-${event.id}`}
                    toX={eventPosition.x}
                    toY={eventPosition.y + (eventPosition.y < timeline.y ? 24 : -24)}
                    arrow
                    tone={event.type}
                  />
                );
              })}

              {events.map((event) => {
                const phase = resolveEventPhase(event);
                const position = eventPositions.get(event.id);
                if (!phase || !position) return null;
                return (
                  <EventNode
                    event={event}
                    key={event.id}
                    onSelect={selectEvent}
                    phase={phase}
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
    </>
  );
}
