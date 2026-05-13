"use client";

import { AlertTriangle, CalendarDays, Mail, Maximize2, Minus, MoveHorizontal, PhoneCall, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  startDate: new Date("2026-01-15"),
  endDate: new Date("2026-04-30"),
  todayDate: new Date("2026-03-16"),
};

const svgWidth = 2200;

const monthMarkers = [
  { label: "Febbraio", date: "2026-02-01" },
  { label: "Marzo", date: "2026-03-01" },
  { label: "Aprile", date: "2026-04-01" },
];

function dateToX(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const duration = timeline.endDate.getTime() - timeline.startDate.getTime();
  const elapsed = date.getTime() - timeline.startDate.getTime();
  const ratio = Math.min(Math.max(elapsed / duration, 0), 1);
  return timeline.startX + ratio * (timeline.endX - timeline.startX);
}

export function PracticeTree({ practice, phases, events }: PracticeTreeProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TreeSelection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerType, setComposerType] = useState<PracticeEvent["type"] | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerDescription, setComposerDescription] = useState("");
  const activeUser = useDemoStore((state) => state.activeUser);
  const applyAction = useDemoStore((state) => state.applyAction);
  const orderedPhases = useMemo(() => [...phases].sort((a, b) => a.order - b.order), [phases]);
  const currentPhase = orderedPhases.find((phase) => phase.status === "in_progress") ?? orderedPhases[0];
  const phasePositions = useMemo(() => {
    let previousX = timeline.startX;
    return new Map(
      orderedPhases.map((phase, index) => {
        const dateX = dateToX(phase.plannedDate);
        const x = index === 0 ? dateX : Math.max(dateX, previousX + 175);
        previousX = x;
        return [phase.id, { x, y: timeline.y }];
      }),
    );
  }, [orderedPhases]);

  const eventPositions = useMemo(
    () =>
      new Map(
        events.map((event, index) => {
          const above = index % 2 === 0;
          return [event.id, { x: dateToX(event.occurredAt), y: above ? 132 : 360 }];
        }),
      ),
    [events],
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

  function openComposer(eventType: PracticeEvent["type"]) {
    const defaultTitle = eventType === "call" ? "Telefonata cliente" : eventType === "mail" ? "Email integrativa" : "Alert scadenza";
    setComposerType(eventType);
    setComposerTitle(defaultTitle);
    setComposerDescription("");
  }

  function createEvent() {
    if (!composerType || !composerTitle.trim() || !currentPhase) return;
    applyAction({
      type: "create_event",
      description: composerDescription.trim() || "Evento demo creato durante walkthrough.",
      eventType: composerType,
      occurredAt: "2026-03-16",
      phaseId: currentPhase.id,
      title: composerTitle.trim(),
    });
    setComposerType(null);
  }

  useEffect(() => {
    scrollToTimelineX(dateToX(timeline.todayDate));
  }, []);

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
            <Button onClick={() => scrollToTimelineX(dateToX(timeline.todayDate))} size="sm" title="Centra su oggi" type="button" variant="outline">
              <CalendarDays className="h-4 w-4" />
              Oggi
            </Button>
            <Button
              onClick={() => currentPhase && scrollToTimelineX(dateToX(currentPhase.plannedDate))}
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
                const x = dateToX(month.date);
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
              <TodayLine x={dateToX(timeline.todayDate)} />

              {events.map((event) => {
                const phase = orderedPhases.find((item) => item.id === event.phaseId);
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
                const phase = orderedPhases.find((item) => item.id === event.phaseId);
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

      <NodeDrawer onOpenChange={setDrawerOpen} open={drawerOpen} selection={freshSelection} />
    </>
  );
}
