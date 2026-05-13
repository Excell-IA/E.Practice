import { Building2, CalendarClock, CircleDot, FolderKanban, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Practice } from "@/lib/types";

type PracticeHeaderProps = {
  practice: Practice;
};

const labelVariant = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "default",
} as const;

export function PracticeHeader({ practice }: PracticeHeaderProps) {
  return (
    <header className="rounded-b-[28px] border-b border-border bg-surface-low/80 px-6 py-6 shadow-electric backdrop-blur md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="font-label font-semibold">{practice.code}</span>
            <span className="h-1 w-1 rounded-full bg-muted" />
            <span>{practice.client.name}</span>
          </div>
          <Badge variant="info">
            <CircleDot className="h-3.5 w-3.5" />
            In corso
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_220px] lg:items-end">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">
                <FolderKanban className="h-3.5 w-3.5" />
                {practice.category}
              </Badge>
              {practice.labels.map((label) => (
                <Badge key={label.id} variant={labelVariant[label.tone]}>
                  <Tag className="h-3.5 w-3.5" />
                  {label.name}
                </Badge>
              ))}
            </div>
            <div>
              <h1 className="max-w-4xl font-display text-3xl font-semibold leading-tight text-foreground md:text-5xl">
                {practice.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-foreground-variant">{practice.description}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-container p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-muted">
              <span className="font-display uppercase tracking-[0.16em]">Avanzamento</span>
              <span className="font-label font-semibold text-electric">{practice.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-high">
              <div className="h-2 w-1/2 rounded-full bg-brand" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted">
              <CalendarClock className="h-4 w-4 text-electric" />
              <span>Scadenza {new Intl.DateTimeFormat("it-IT").format(new Date(practice.dueDate))}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Building2 className="h-4 w-4 text-electric" />
              <span>{practice.client.city}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
