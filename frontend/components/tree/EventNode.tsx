import { AlertTriangle, Mail, PhoneCall } from "lucide-react";

import type { PracticeEvent, PracticePhase } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventNodeProps = {
  event: PracticeEvent;
  phase: PracticePhase;
  x: number;
  y: number;
  timelineY: number;
  onSelect: (event: PracticeEvent, phase: PracticePhase) => void;
};

const eventToneClass = {
  call: "fill-warning/20 stroke-warning",
  mail: "fill-[#C193FF]/20 stroke-[#C193FF]",
  warning: "fill-warning/20 stroke-warning",
};

const eventIcon = {
  call: PhoneCall,
  mail: Mail,
  warning: AlertTriangle,
};

const eventTypeLabel = {
  call: "Telefonata",
  mail: "Email",
  warning: "Avviso",
};

function truncateLabel(text: string, maxLen = 16) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

export function EventNode({ event, phase, timelineY, x, y, onSelect }: EventNodeProps) {
  const Icon = eventIcon[event.type];
  const typeLabel = eventTypeLabel[event.type];
  const labelY = y < timelineY ? -40 : 54;
  const eventDate = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(event.occurredAt));
  const dateChipY = y < timelineY ? timelineY + 30 : timelineY - 24;

  return (
    <g
      aria-label={`${typeLabel}: ${event.title}`}
      className="group cursor-pointer"
      onClick={() => onSelect(event, phase)}
      role="button"
      tabIndex={0}
      transform={`translate(${x} 0)`}
    >
      <title>{`${typeLabel} — ${event.title} — ${eventDate}`}</title>
      <circle className="fill-transparent" cy={timelineY} r="24" />
      <circle className="fill-electric/10 stroke-electric/20 stroke-2 transition-colors group-hover:fill-electric/20 group-hover:stroke-electric/50" cy={timelineY} r="18" />
      <circle className="fill-surface-high stroke-electric stroke-2" cy={timelineY} r="12" />
      <circle className="fill-electric" cy={timelineY} r="5" />
      <g className="opacity-0 transition-opacity group-hover:opacity-100">
        <rect className="fill-surface-high stroke-border" height="50" rx="12" width="164" x="-82" y={dateChipY - 30} />
        <text className="fill-electric text-[10px] font-semibold uppercase tracking-wider" textAnchor="middle" y={dateChipY - 16}>
          {typeLabel}
        </text>
        <text className="fill-foreground text-[11px] font-semibold" textAnchor="middle" y={dateChipY - 1}>
          {eventDate}
        </text>
        <text className="fill-muted text-[10px] font-semibold" textAnchor="middle" y={dateChipY + 13}>
          {event.author.name}
        </text>
      </g>
      <g transform={`translate(0 ${y})`}>
        <circle className="fill-none stroke-electric/0 stroke-2 transition-colors group-hover:stroke-electric/45" r="22" />
        <circle className={cn("stroke-[1.5]", eventToneClass[event.type])} r="18" />
        <foreignObject height="20" width="20" x="-10" y="-10">
          <div className="flex h-5 w-5 items-center justify-center text-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </foreignObject>
        <rect className="fill-surface-container" height="22" rx="11" width="104" x="-52" y={labelY - 15} />
        <text className="fill-muted text-[11px] font-semibold" textAnchor="middle" y={labelY}>
          {truncateLabel(event.title)}
        </text>
      </g>
    </g>
  );
}
