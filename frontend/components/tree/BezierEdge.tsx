import { cn } from "@/lib/utils";

type BezierEdgeProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  tone: "call" | "mail" | "warning";
};

const toneClass = {
  call: "stroke-warning",
  mail: "stroke-[#C193FF]",
  warning: "stroke-warning",
};

export function BezierEdge({ fromX, fromY, toX, toY, tone }: BezierEdgeProps) {
  const controlY = fromY < toY ? fromY + 58 : fromY - 58;
  const d = `M ${fromX} ${fromY} C ${fromX} ${controlY}, ${toX} ${controlY}, ${toX} ${toY}`;

  return <path className={cn("fill-none stroke-[1.5] opacity-80", toneClass[tone])} d={d} />;
}
