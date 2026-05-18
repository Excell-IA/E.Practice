import { Check, CircleSlash, Lock, Minus } from "lucide-react";

import { phaseStatusLabel } from "@/lib/phase-labels";
import type { PracticePhase } from "@/lib/types";
import { cn } from "@/lib/utils";

type PhaseNodeProps = {
  phase: PracticePhase;
  totalPhases: number;
  x: number;
  y: number;
  selected: boolean;
  onSelect: (phase: PracticePhase) => void;
};

const statusLabel = phaseStatusLabel;

function splitTitle(title: string): string[] {
  const maxPerLine = 14;
  const ellipsis = "…";
  if (title.length <= maxPerLine) return [title];
  const words = title.split(" ");
  if (words.length < 2) {
    return [title.slice(0, maxPerLine - 1).trimEnd() + ellipsis];
  }
  let line1 = "";
  let line2 = "";
  for (const word of words) {
    if (line1 === "") {
      line1 = word;
    } else if ((line1 + " " + word).length <= maxPerLine) {
      line1 = line1 + " " + word;
    } else if (line2 === "") {
      line2 = word;
    } else if ((line2 + " " + word).length <= maxPerLine) {
      line2 = line2 + " " + word;
    } else {
      line2 = (line2 + " " + word).slice(0, maxPerLine - 1).trimEnd() + ellipsis;
      break;
    }
  }
  if (line1.length > maxPerLine) line1 = line1.slice(0, maxPerLine - 1).trimEnd() + ellipsis;
  if (line2.length > maxPerLine) line2 = line2.slice(0, maxPerLine - 1).trimEnd() + ellipsis;
  return line2 ? [line1, line2] : [line1];
}

function StatusIcon({ phase }: { phase: PracticePhase }) {
  const status = phase.status;
  if (status === "done") return <Check className="h-5 w-5 text-[var(--on-primary)]" />;
  if (status === "skipped") return <CircleSlash className="h-5 w-5 text-muted" />;
  if (status === "blocked") return <Lock className="h-5 w-5 text-danger" />;
  if (status === "pending") return <span className="font-label text-base font-bold text-muted">{phase.order}</span>;
  return <span className="font-label text-base font-bold text-[var(--on-primary)]">{phase.order}</span>;
}

export function PhaseNode({ phase, totalPhases, x, y, selected, onSelect }: PhaseNodeProps) {
  const date = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" }).format(
    new Date(phase.plannedDate),
  );
  const fullDate = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(phase.plannedDate));
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
      <title>{`Fase ${phase.order} di ${totalPhases} — ${phase.title} — ${statusLabel[phase.status]} — ${fullDate}`}</title>
      <g className="opacity-0 transition-opacity group-hover:opacity-100">
        <rect className="fill-surface-high stroke-border" height="40" rx="12" width="148" x="-74" y="-78" />
        <text className="fill-electric text-[10px] font-semibold uppercase tracking-wider" textAnchor="middle" y="-62">
          Fase {phase.order} di {totalPhases}
        </text>
        <text className="fill-foreground text-[11px] font-semibold" textAnchor="middle" y="-47">
          {fullDate}
        </text>
      </g>
      {phase.status === "done" ? <circle className="fill-success/20 stroke-success/30" r="36" /> : null}
      {isActive ? <circle className="fill-electric opacity-20" r="42" /> : null}
      {selected || isActive ? <circle className="fill-none stroke-electric stroke-2" r="36" /> : null}
      <circle className="fill-none stroke-electric/0 stroke-2 transition-colors group-hover:stroke-electric/55" r="38" />
      <circle
        className={cn(
          "stroke-[1.6]",
          phase.status === "done" && "fill-success stroke-success",
          phase.status === "in_progress" && "fill-electric stroke-electric",
          phase.status === "pending" && "fill-surface-container stroke-muted/80",
          phase.status === "skipped" && "fill-surface-high stroke-muted/70",
          phase.status === "blocked" && "fill-danger/15 stroke-danger",
        )}
        r="28"
      />
      <foreignObject height="28" width="28" x="-14" y="-14">
        <div className="flex h-7 w-7 items-center justify-center">
          {phase.status === "in_progress" ? (
            <span className="font-label text-base font-bold text-[var(--on-primary)]">{phase.order}</span>
          ) : (
            <StatusIcon phase={phase} />
          )}
        </div>
      </foreignObject>
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
