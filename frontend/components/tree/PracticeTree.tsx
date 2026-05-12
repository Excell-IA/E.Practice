"use client";

import { Maximize2, Minus, MoveHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  { label: "Centra", icon: MoveHorizontal },
  { label: "Adatta", icon: Maximize2 },
];

export function PracticeTree({ practice, phases, events }: PracticeTreeProps) {
  const [selection, setSelection] = useState<TreeSelection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const orderedPhases = useMemo(() => [...phases].sort((a, b) => a.order - b.order), [phases]);
  const phasePositions = useMemo(() => {
    const spacing = 1000 / Math.max(orderedPhases.length - 1, 1);
    return new Map(orderedPhases.map((phase, index) => [phase.id, { x: 100 + spacing * index, y: 240 }]));
  }, [orderedPhases]);

  const eventPositions = useMemo(
    () =>
      new Map(
        events.map((event, index) => {
          const phasePosition = phasePositions.get(event.phaseId) ?? { x: 100, y: 240 };
          const above = index % 2 === 0;
          return [event.id, { x: phasePosition.x - 36 + index * 8, y: above ? 140 : 340 }];
        }),
      ),
    [events, phasePositions],
  );

  function selectPhase(phase: PracticePhase) {
    setSelection({ kind: "phase", item: phase });
    setDrawerOpen(true);
  }

  function selectEvent(event: PracticeEvent, phase: PracticePhase) {
    setSelection({ kind: "event", item: event, phase });
    setDrawerOpen(true);
  }

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
          <div className="flex items-center gap-2">
            {disabledToolbar.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  aria-label={item.label}
                  className="cursor-not-allowed opacity-50"
                  disabled
                  key={item.label}
                  size="icon"
                  title="Disponibile in V1"
                  type="button"
                  variant="outline"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <svg
              aria-label="Albero della pratica"
              className="h-[430px] min-w-[1200px] text-foreground"
              role="img"
              viewBox="0 0 1200 430"
            >
              <defs>
                <linearGradient id="mainLine" x1="80" x2="1120" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--success)" />
                  <stop offset="50%" stopColor="var(--electric)" />
                  <stop offset="100%" stopColor="var(--on-surface-muted)" stopOpacity="0.45" />
                </linearGradient>
              </defs>

              <line className="stroke-border stroke-[10] opacity-70" x1="80" x2="1120" y1="240" y2="240" />
              <line className="stroke-[url(#mainLine)] stroke-[5]" x1="80" x2="1120" y1="240" y2="240" />
              <TodayLine />

              {events.map((event) => {
                const phase = orderedPhases.find((item) => item.id === event.phaseId);
                const eventPosition = eventPositions.get(event.id);
                const phasePosition = phase ? phasePositions.get(phase.id) : null;
                if (!phase || !eventPosition || !phasePosition) return null;
                return (
                  <BezierEdge
                    fromX={eventPosition.x}
                    fromY={eventPosition.y + (eventPosition.y < phasePosition.y ? 18 : -18)}
                    key={`edge-${event.id}`}
                    toX={phasePosition.x}
                    toY={phasePosition.y + (eventPosition.y < phasePosition.y ? -26 : 26)}
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

      <NodeDrawer onOpenChange={setDrawerOpen} open={drawerOpen} selection={selection} />
    </>
  );
}
