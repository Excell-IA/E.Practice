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

function splitTitle(title: string) {
  const words = title.split(" ");
  if (words.length < 3) return [title];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function StatusIcon({ phase }: { phase: PracticePhase }) {
  const status = phase.status;
  if (status === "done") return <Check className="h-5 w-5 text-[var(--on-primary)]" />;
  if (status === "skipped") return <CircleSlash className="h-5 w-5 text-muted" />;
  if (status === "blocked") return <Lock className="h-5 w-5 text-danger" />;
  if (status === "pending") return <Minus className="h-5 w-5 text-muted" />;
  return <span className="font-label text-base font-bold text-[var(--on-primary)]">{phase.order}</span>;
}

export function PhaseNode({ phase, x, y, selected, onSelect }: PhaseNodeProps) {
  const date = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" }).format(
    new Date(phase.plannedDate),
  );
  const isActive = phase.status === "in_progress";
  const titleLines = splitTitle(phase.title);

  return (
    <g
      aria-label={`${phase.title}, ${statusLabel[phase.status]}`}
      className="group cursor-pointer outline-none"
      onClick={() => onSelect(phase)}
      role="button"
      tabIndex={0}
      transform={`translate(${x} ${y})`}
    >
      {phase.status === "done" ? <circle className="fill-success/20 stroke-success/30" r="34" /> : null}
      {isActive ? <circle className="fill-electric opacity-20" r="42" /> : null}
      {selected || isActive ? <circle className="fill-none stroke-electric stroke-2" r="34" /> : null}
      <circle className="fill-none stroke-electric/0 stroke-2 transition-colors group-hover:stroke-electric/55" r="38" />
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
            <StatusIcon phase={phase} />
          )}
        </div>
      </foreignObject>
      <text className="fill-muted text-[10px] font-bold tracking-[0.12em]" textAnchor="middle" y="-22">
        {`F${String(phase.order).padStart(2, "0")}`}
      </text>
      <text className="fill-muted text-[11px] font-semibold" textAnchor="middle" y="56">
        {date}
      </text>
      <text className="fill-foreground-variant text-[13px] font-semibold" textAnchor="middle" y="78">
        {titleLines.map((line, index) => (
          <tspan dy={index === 0 ? 0 : 17} key={line} x="0">
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
