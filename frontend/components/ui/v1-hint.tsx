import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type V1HintProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

export function V1Hint({ children, className, label = "Componente da sviluppare" }: V1HintProps) {
  return (
    <span className={cn("group/v1 relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-lg border border-border bg-surface-high px-2.5 py-1.5 font-label text-[11px] font-semibold text-foreground shadow-[var(--shadow-card)] group-hover/v1:block">
        {label}
      </span>
    </span>
  );
}
