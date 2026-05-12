export function TodayLine() {
  return (
    <g aria-label="Linea oggi">
      <line className="stroke-electric stroke-[1.5] [stroke-dasharray:4_6]" x1="622" x2="622" y1="40" y2="395" />
      <rect className="fill-surface-high" height="20" rx="10" width="54" x="595" y="22" />
      <circle className="fill-electric" cx="608" cy="32" r="3" />
      <text className="fill-electric text-[10px] font-bold tracking-[0.12em]" x="617" y="36">
        OGGI
      </text>
    </g>
  );
}
