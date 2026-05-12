import { Check, CircleSlash, Lock, Minus } from "lucide-react";

import type { PracticePhase } from "@/lib/types";
import { cn } from "@/lib/utils";

type PhaseNodeProps = {
  phase: PracticePhase;
  x: number;
  y: number;
  selected: boolean;
  onSelect: (phase: PracticePhase) => void;
};

const statusLabel = {
  done: "Completata",
  in_progress: "In corso",
  pending: "Da fare",
  skipped: "Saltata",
  blocked: "Bloccata",
};

function StatusIcon({ status }: { status: PracticePhase["status"] }) {
  if (status === "done") return <Check className="h-5 w-5 text-[var(--on-primary)]" />;
  if (status === "skipped") return <CircleSlash className="h-5 w-5 text-muted" />;
  if (status === "blocked") return <Lock className="h-5 w-5 text-danger" />;
  if (status === "pending") return <Minus className="h-5 w-5 text-muted" />;
  return <span className="font-label text-base font-bold text-[var(--on-primary)]">{phaseNumber(status)}</span>;
}

function phaseNumber(status: PracticePhase["status"]) {
  return status === "in_progress" ? "4" : "";
}

export function PhaseNode({ phase, x, y, selected, onSelect }: PhaseNodeProps) {
  const date = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" }).format(
    new Date(phase.plannedDate),
  );
  const isActive = phase.status === "in_progress";

  return (
    <g
      aria-label={`${phase.title}, ${statusLabel[phase.status]}`}
      className="cursor-pointer outline-none transition-transform duration-150 hover:scale-105"
      onClick={() => onSelect(phase)}
      role="button"
      tabIndex={0}
      transform={`translate(${x} ${y})`}
    >
      {phase.status === "done" ? <circle className="fill-success/20 stroke-success/30" r="34" /> : null}
      {isActive ? <circle className="fill-electric opacity-20" r="42" /> : null}
      {selected || isActive ? <circle className="fill-none stroke-electric stroke-2" r="34" /> : null}
      <circle
        className={cn(
          "stroke-[1.4]",
          phase.status === "done" && "fill-success stroke-success",
          phase.status === "in_progress" && "fill-electric stroke-electric",
          phase.status === "pending" && "fill-surface-container stroke-muted/80",
          phase.status === "skipped" && "fill-surface-high stroke-muted/70",
          phase.status === "blocked" && "fill-danger/15 stroke-danger",
        )}
        r="28"
      />
      <foreignObject height="24" width="24" x="-12" y="-12">
        <div className="flex h-6 w-6 items-center justify-center">
          {phase.status === "in_progress" ? (
            <span className="font-label text-base font-bold text-[var(--on-primary)]">{phase.order}</span>
          ) : (
            <StatusIcon status={phase.status} />
          )}
        </div>
      </foreignObject>
      <text className="fill-muted text-[10px] font-bold tracking-[0.12em]" textAnchor="middle" y="-22">
        {String(phase.order).padStart(2, "0")}
      </text>
      <text className="fill-muted text-[11px] font-semibold" textAnchor="middle" y="56">
        {date}
      </text>
      <text className="fill-foreground-variant text-[11px] font-semibold" textAnchor="middle" y="76">
        {phase.title}
      </text>
    </g>
  );
}
