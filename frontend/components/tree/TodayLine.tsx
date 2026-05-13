type TodayLineProps = {
  x: number;
};

export function TodayLine({ x }: TodayLineProps) {
  return (
    <g aria-label="Linea oggi">
      <line className="stroke-electric stroke-[1.5] [stroke-dasharray:4_6]" x1={x} x2={x} y1="58" y2="420" />
      <rect className="fill-surface-high" height="20" rx="10" width="54" x={x - 27} y="30" />
      <circle className="fill-electric" cx={x - 14} cy="40" r="3" />
      <text className="fill-electric text-[10px] font-bold tracking-[0.12em]" x={x - 5} y="44">
        OGGI
      </text>
    </g>
  );
}
