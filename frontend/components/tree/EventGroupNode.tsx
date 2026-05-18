import { AlertTriangle, Mail, PhoneCall } from "lucide-react";

import type { PracticeEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventGroupNodeProps = {
  type: PracticeEvent["type"];
  count: number;
  date: string;
  x: number;
  y: number;
  timelineY: number;
  onSelect: () => void;
};

const groupToneClass = {
  call: "fill-warning/25 stroke-warning",
  mail: "fill-[#C193FF]/25 stroke-[#C193FF]",
  warning: "fill-warning/25 stroke-warning",
};

const groupIcon = {
  call: PhoneCall,
  mail: Mail,
  warning: AlertTriangle,
};

const groupTypeLabel = {
  call: "Telefonate",
  mail: "Email",
  warning: "Avvisi",
};

export function EventGroupNode({ type, count, date, timelineY, x, y, onSelect }: EventGroupNodeProps) {
  const Icon = groupIcon[type];
  const typeLabel = groupTypeLabel[type];
  const labelY = y < timelineY ? -40 : 54;
  const formattedDate = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
  const dateChipY = y < timelineY ? timelineY + 30 : timelineY - 24;

  return (
    <g
      aria-label={`${count} ${typeLabel.toLowerCase()} il ${formattedDate}`}
      className="group cursor-pointer"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      transform={`translate(${x} 0)`}
    >
      <title>{`${count} ${typeLabel.toLowerCase()} - ${formattedDate} - clicca per lo storico`}</title>
      <circle className="fill-transparent" cy={timelineY} r="24" />
      <circle className="fill-electric/10 stroke-electric/20 stroke-2 transition-colors group-hover:fill-electric/20 group-hover:stroke-electric/50" cy={timelineY} r="18" />
      <circle className="fill-surface-high stroke-electric stroke-2" cy={timelineY} r="12" />
      <circle className="fill-electric" cy={timelineY} r="5" />
      <g className="opacity-0 transition-opacity group-hover:opacity-100">
        <rect className="fill-surface-high stroke-border" height="50" rx="12" width="180" x="-90" y={dateChipY - 30} />
        <text className="fill-electric text-[10px] font-semibold uppercase tracking-wider" textAnchor="middle" y={dateChipY - 16}>
          {count} {typeLabel.toLowerCase()}
        </text>
        <text className="fill-foreground text-[11px] font-semibold" textAnchor="middle" y={dateChipY - 1}>
          {formattedDate}
        </text>
        <text className="fill-muted text-[10px] font-semibold" textAnchor="middle" y={dateChipY + 13}>
          Clicca per lo storico
        </text>
      </g>
      <g transform={`translate(0 ${y})`}>
        <circle className="fill-none stroke-electric/0 stroke-2 transition-colors group-hover:stroke-electric/45" r="26" />
        <circle className={cn("stroke-[1.8]", groupToneClass[type])} r="22" />
        <foreignObject height="18" width="18" x="-9" y="-14">
          <div className="flex h-4 w-4 items-center justify-center text-foreground">
            <Icon className="h-3.5 w-3.5" />
          </div>
        </foreignObject>
        <text className="fill-foreground text-[14px] font-bold" textAnchor="middle" y="9">
          {count}
        </text>
        <rect className="fill-surface-container" height="22" rx="11" width="104" x="-52" y={labelY - 15} />
        <text className="fill-muted text-[11px] font-semibold" textAnchor="middle" y={labelY}>
          {typeLabel}
        </text>
      </g>
    </g>
  );
}
