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

export function EventNode({ event, phase, timelineY, x, y, onSelect }: EventNodeProps) {
  const Icon = eventIcon[event.type];
  const labelY = y < timelineY ? -40 : 54;

  return (
    <g
      aria-label={event.title}
      className="group cursor-pointer"
      onClick={() => onSelect(event, phase)}
      role="button"
      tabIndex={0}
      transform={`translate(${x} 0)`}
    >
      <circle className="fill-surface-container stroke-electric/70 stroke-2" cy={timelineY} r="7" />
      <circle className="fill-electric/45" cy={timelineY} r="3" />
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
        {event.title}
      </text>
      </g>
    </g>
  );
}
