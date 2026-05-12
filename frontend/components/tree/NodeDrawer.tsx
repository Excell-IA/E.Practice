"use client";

import { CalendarDays, Check, FileText, Paperclip, SkipForward, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TreeSelection } from "@/lib/types";

type NodeDrawerProps = {
  selection: TreeSelection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NodeDrawer({ selection, open, onOpenChange }: NodeDrawerProps) {
  const isPhase = selection?.kind === "phase";
  const title = isPhase ? selection.item.title : selection?.item.title;
  const description = isPhase ? selection.item.description : selection?.item.description;
  const assignee = isPhase ? selection.item.assignee : selection?.item.author;
  const date = isPhase ? selection.item.dueDate : selection?.item.occurredAt;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent>
        <SheetHeader>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
            {isPhase ? `Fase ${selection.item.order} di 10 · Bilancio` : `Evento · ${selection?.phase.title}`}
          </p>
          <SheetTitle>{title ?? "Dettaglio nodo"}</SheetTitle>
          <SheetDescription>{description ?? "Seleziona una fase o un evento per vedere i dettagli."}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
          <section className="space-y-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Stato</p>
            <Badge variant={isPhase && selection.item.status === "in_progress" ? "info" : "default"}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {isPhase ? selection.item.status.replace("_", " ") : selection?.item.type}
            </Badge>
          </section>

          <section className="space-y-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Assegnatario
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-low p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-[var(--on-primary)]">
                {assignee?.initials}
              </div>
              <div>
                <p className="font-semibold text-foreground">{assignee?.name}</p>
                <p className="text-xs text-muted">{assignee?.role}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Date</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-surface-low p-3">
                <CalendarDays className="mb-3 h-4 w-4 text-electric" />
                <p className="text-xs text-muted">Scadenza</p>
                <p className="font-label text-sm font-semibold text-foreground">
                  {date ? new Intl.DateTimeFormat("it-IT").format(new Date(date)) : "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-low p-3">
                <UserRound className="mb-3 h-4 w-4 text-electric" />
                <p className="text-xs text-muted">Owner</p>
                <p className="font-label text-sm font-semibold text-foreground">{assignee?.initials}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Materiale</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-low p-3 text-sm">
                <span className="flex items-center gap-2 text-foreground-variant">
                  <FileText className="h-4 w-4 text-electric" />
                  Note operative
                </span>
                <span className="text-muted">{isPhase ? selection.item.notesCount : 1}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-low p-3 text-sm">
                <span className="flex items-center gap-2 text-foreground-variant">
                  <Paperclip className="h-4 w-4 text-electric" />
                  Allegati
                </span>
                <span className="text-muted">{isPhase ? selection.item.attachmentsCount : 0}</span>
              </div>
            </div>
          </section>

          {isPhase ? (
            <div className="mt-auto flex gap-2 border-t border-border pt-4">
              <Button className="flex-1" type="button">
                <Check className="h-4 w-4" />
                Completa fase
              </Button>
              <Button title="Salta fase (registra motivazione)" type="button" variant="warning">
                <SkipForward className="h-4 w-4" />
                Salta
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
