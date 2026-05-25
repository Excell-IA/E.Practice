import { Mail, MessageCircle, PhoneCall } from "lucide-react";

import type { PracticeEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

type CommunicationsGroupNodeProps = {
  events: PracticeEvent[];
  startDate: string;
  endDate: string;
  x: number;
  y: number;
  timelineY: number;
  onSelect: () => void;
};

const eventToneClass = {
  call: "fill-warning/20 stroke-warning",
  mail: "fill-[#C193FF]/20 stroke-[#C193FF]",
};

const eventIcon = {
  call: PhoneCall,
  mail: Mail,
};

const eventTypeLabel = {
  call: "Telefonata",
  mail: "Email",
};

function formatShort(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDayMonth(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

export function CommunicationsGroupNode({ events, startDate, endDate, timelineY, x, y, onSelect }: CommunicationsGroupNodeProps) {
  const count = events.length;
  const isMulti = count > 1;
  const single = events[0];
  const dateChipY = y < timelineY ? timelineY + 30 : timelineY - 24;
  const formattedDate = startDate === endDate
    ? formatShort(startDate)
    : `${formatDayMonth(startDate)} → ${formatShort(endDate)}`;

  const SingleIcon = isMulti ? MessageCircle : eventIcon[single.type];
  const titleLabel = isMulti
    ? `${count} comunicazioni`
    : `${eventTypeLabel[single.type]}: ${single.title}`;
  const hoverTopLabel = isMulti ? "Comunicazioni" : eventTypeLabel[single.type];
  const hoverBottomLabel = isMulti ? `${count} elementi — clicca per la lista` : single.author.name;
  const toneClass = isMulti ? "fill-electric/15 stroke-electric" : eventToneClass[single.type];

  return (
    <g
      aria-label={titleLabel}
      className="group cursor-pointer"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      transform={`translate(${x} 0)`}
    >
      <title>{`${titleLabel} — ${formattedDate}`}</title>
      <circle className="fill-transparent" cy={timelineY} r="24" />
      <circle className="fill-electric/10 stroke-electric/20 stroke-2 transition-colors group-hover:fill-electric/20 group-hover:stroke-electric/50" cy={timelineY} r="18" />
      <circle className="fill-surface-high stroke-electric stroke-2" cy={timelineY} r="12" />
      <circle className="fill-electric" cy={timelineY} r="5" />
      <g className="opacity-0 transition-opacity group-hover:opacity-100">
        <rect className="fill-surface-high stroke-border" height="50" rx="12" width="180" x="-90" y={dateChipY - 30} />
        <text className="fill-electric text-[10px] font-semibold uppercase tracking-wider" textAnchor="middle" y={dateChipY - 16}>
          {hoverTopLabel}
        </text>
        <text className="fill-foreground text-[11px] font-semibold" textAnchor="middle" y={dateChipY - 1}>
          {formattedDate}
        </text>
        <text className="fill-muted text-[10px] font-semibold" textAnchor="middle" y={dateChipY + 13}>
          {hoverBottomLabel}
        </text>
      </g>
      <g transform={`translate(0 ${y})`}>
        <circle className="fill-none stroke-electric/0 stroke-2 transition-colors group-hover:stroke-electric/45" r="24" />
        <circle className={cn("stroke-[1.6]", toneClass)} r="20" />
        {isMulti ? (
          <text className="fill-foreground text-[15px] font-bold" textAnchor="middle" dominantBaseline="central">
            {count}
          </text>
        ) : (
          <foreignObject height="20" width="20" x="-10" y="-10">
            <div className="flex h-5 w-5 items-center justify-center text-foreground">
              <SingleIcon className="h-4 w-4" />
            </div>
          </foreignObject>
        )}
      </g>
    </g>
  );
}
