"use client";

import {
  Mail,
  MessageSquareText,
  PhoneCall,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDemoStore, type DemoNote } from "@/lib/demo-state";
import type { PracticeEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TimelineDayGroup =
  | { kind: "communications"; startDate: string; endDate: string; items: PracticeEvent[] }
  | { kind: "notes"; startDate: string; endDate: string; items: DemoNote[] };

type TimelineDayDrawerProps = {
  group: TimelineDayGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const eventTypeMeta = {
  call: { label: "Telefonata", icon: PhoneCall, tone: "warning" as const, chipClass: "bg-warning/15 text-warning border-warning/30" },
  mail: { label: "Email", icon: Mail, tone: "info" as const, chipClass: "bg-[#C193FF]/15 text-[#C193FF] border-[#C193FF]/30" },
};

const noteMeta = {
  label: "Nota",
  icon: MessageSquareText,
  chipClass: "bg-electric/15 text-electric border-electric/30",
};

function formatDateLong(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatDayMonth(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
  }).format(parsed);
}

function formatRange(startDate: string, endDate: string) {
  if (startDate === endDate) return formatDateLong(startDate);
  return `${formatDayMonth(startDate)} → ${formatDateLong(endDate)}`;
}

function noteSortKey(note: DemoNote) {
  return note.createdAt ?? note.occurredAt ?? "";
}

function eventSortKey(event: PracticeEvent) {
  return `${event.occurredAt ?? ""}__${event.id}`;
}

export function TimelineDayDrawer({ group, open, onOpenChange }: TimelineDayDrawerProps) {
  const activeUser = useDemoStore((state) => state.activeUser);
  const applyAction = useDemoStore((state) => state.applyAction);
  const canEdit = activeUser.permission !== "viewer";

  const sortedItems = useMemo(() => {
    if (!group) return [];
    if (group.kind === "notes") {
      return [...group.items].sort((a, b) => noteSortKey(b).localeCompare(noteSortKey(a)));
    }
    return [...group.items].sort((a, b) => eventSortKey(b).localeCompare(eventSortKey(a)));
  }, [group]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState({ authorId: "", description: "", occurredAt: "", title: "" });
  const [noteDraft, setNoteDraft] = useState({ authorId: "", body: "", occurredAt: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!group || sortedItems.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => {
      if (current && sortedItems.some((item) => item.id === current)) return current;
      return sortedItems[0].id;
    });
  }, [group, sortedItems]);

  const selectedItem = sortedItems.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedItem || !group) return;
    if (group.kind === "communications") {
      const event = selectedItem as PracticeEvent;
      setEventDraft({
        authorId: event.author.id,
        description: event.description,
        occurredAt: event.occurredAt,
        title: event.title,
      });
    } else {
      const note = selectedItem as DemoNote;
      setNoteDraft({
        authorId: note.author.id,
        body: note.body,
        occurredAt: note.occurredAt ?? note.createdAt.slice(0, 10),
      });
    }
    setSaved(false);
  }, [selectedItem, group]);

  if (!group) return null;

  const headerLabel = group.kind === "communications" ? "Comunicazioni" : "Note";
  const headerCount = sortedItems.length;
  const rangeLabel = formatRange(group.startDate, group.endDate);
  const headerTitle = headerCount > 1
    ? `${headerCount} ${headerLabel.toLowerCase()} — ${rangeLabel}`
    : `${headerLabel} — ${rangeLabel}`;

  function saveCurrent() {
    if (!selectedItem || !group || saved) return;
    if (group.kind === "communications") {
      const event = selectedItem as PracticeEvent;
      if (!eventDraft.title.trim() || !eventDraft.occurredAt) return;
      applyAction({
        type: "update_event",
        authorId: eventDraft.authorId,
        description: eventDraft.description.trim(),
        eventId: event.id,
        occurredAt: eventDraft.occurredAt,
        phaseId: event.phaseId,
        title: eventDraft.title.trim(),
      });
    } else {
      const note = selectedItem as DemoNote;
      if (!noteDraft.body.trim()) return;
      applyAction({
        type: "update_note",
        authorId: noteDraft.authorId,
        body: noteDraft.body.trim(),
        noteId: note.id,
        occurredAt: noteDraft.occurredAt,
      });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent>
        <SheetHeader>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
            {headerLabel} del giorno
          </p>
          <SheetTitle>{headerTitle}</SheetTitle>
          <SheetDescription>
            {headerCount > 1
              ? "Clicca una riga in alto per aprirla nel form, poi modifica e salva."
              : "Modifica i campi e premi Salva per aggiornare."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {headerCount > 1 ? (
            <section className="space-y-2">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Elenco ({headerCount})
              </p>
              <div className="flex max-h-[28vh] flex-col gap-2 overflow-y-auto pr-1">
                {sortedItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  if (group.kind === "communications") {
                    const ev = item as PracticeEvent;
                    const meta = eventTypeMeta[ev.type];
                    const Icon = meta.icon;
                    const rowDate = formatDayMonth(ev.occurredAt);
                    return (
                      <button
                        className={cn(
                          "flex items-center gap-3 rounded-xl border bg-surface-container px-3 py-2 text-left transition-colors",
                          isSelected ? "border-electric bg-electric/5" : "border-border hover:border-electric/40 hover:bg-surface-high",
                        )}
                        key={ev.id}
                        onClick={() => setSelectedId(ev.id)}
                        type="button"
                      >
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", meta.chipClass)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-label text-sm font-semibold text-foreground">{ev.title}</span>
                          <span className="truncate text-[11px] text-muted">{meta.label} — {ev.author.name}</span>
                        </span>
                        <span className="shrink-0 font-label text-[11px] font-semibold text-muted">{rowDate}</span>
                      </button>
                    );
                  }
                  const note = item as DemoNote;
                  const Icon = noteMeta.icon;
                  const preview = note.body.length > 60 ? `${note.body.slice(0, 60)}…` : note.body;
                  const rowDate = formatDayMonth(note.occurredAt ?? note.createdAt.slice(0, 10));
                  return (
                    <button
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-surface-container px-3 py-2 text-left transition-colors",
                        isSelected ? "border-electric bg-electric/5" : "border-border hover:border-electric/40 hover:bg-surface-high",
                      )}
                      key={note.id}
                      onClick={() => setSelectedId(note.id)}
                      type="button"
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", noteMeta.chipClass)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-label text-sm font-semibold text-foreground">{preview || "(vuota)"}</span>
                        <span className="truncate text-[11px] text-muted">Nota — {note.author.name}</span>
                      </span>
                      <span className="shrink-0 font-label text-[11px] font-semibold text-muted">{rowDate}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {selectedItem && group.kind === "communications" ? (
            <CommunicationEditor
              canEdit={canEdit}
              description={eventDraft.description}
              event={selectedItem as PracticeEvent}
              occurredAt={eventDraft.occurredAt}
              onChange={(patch) => setEventDraft((draft) => ({ ...draft, ...patch }))}
              onSave={saveCurrent}
              saved={saved}
              title={eventDraft.title}
            />
          ) : null}

          {selectedItem && group.kind === "notes" ? (
            <NoteEditor
              body={noteDraft.body}
              canEdit={canEdit}
              note={selectedItem as DemoNote}
              occurredAt={noteDraft.occurredAt}
              onChange={(patch) => setNoteDraft((draft) => ({ ...draft, ...patch }))}
              onSave={saveCurrent}
              saved={saved}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type CommunicationEditorProps = {
  event: PracticeEvent;
  title: string;
  description: string;
  occurredAt: string;
  canEdit: boolean;
  saved: boolean;
  onChange: (patch: Partial<{ title: string; description: string; occurredAt: string }>) => void;
  onSave: () => void;
};

function CommunicationEditor({ event, title, description, occurredAt, canEdit, saved, onChange, onSave }: CommunicationEditorProps) {
  const meta = eventTypeMeta[event.type];
  const Icon = meta.icon;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Dettaglio comunicazione</p>
          <p className="text-sm text-foreground-variant">Creata da <span className="font-semibold text-foreground">{event.author.name}</span></p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.chipClass)}>
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface-low p-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">Titolo</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
            onChange={(e) => onChange({ title: e.target.value })}
            value={title}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">Descrizione</span>
          <textarea
            className="min-h-24 w-full resize-none rounded-xl border border-border bg-surface-container p-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
            onChange={(e) => onChange({ description: e.target.value })}
            value={description}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">Data</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
            lang="it-IT"
            onChange={(e) => onChange({ occurredAt: e.target.value })}
            type="date"
            value={occurredAt}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!canEdit || !title.trim() || saved} onClick={onSave} type="button">
            <Save className="h-4 w-4" />
            Salva modifiche
          </Button>
          {saved ? <Badge variant="success">Salvato ✓</Badge> : null}
        </div>
      </div>
    </section>
  );
}

type NoteEditorProps = {
  note: DemoNote;
  body: string;
  occurredAt: string;
  canEdit: boolean;
  saved: boolean;
  onChange: (patch: Partial<{ body: string; occurredAt: string }>) => void;
  onSave: () => void;
};

function NoteEditor({ note, body, occurredAt, canEdit, saved, onChange, onSave }: NoteEditorProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Dettaglio nota</p>
          <p className="text-sm text-foreground-variant">Creata da <span className="font-semibold text-foreground">{note.author.name}</span></p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold", noteMeta.chipClass)}>
          <MessageSquareText className="h-3 w-3" />
          {noteMeta.label}
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface-low p-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">Nota</span>
          <textarea
            className="min-h-28 w-full resize-none rounded-xl border border-border bg-surface-container p-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
            onChange={(e) => onChange({ body: e.target.value })}
            value={body}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted">Data</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
            lang="it-IT"
            onChange={(e) => onChange({ occurredAt: e.target.value })}
            type="date"
            value={occurredAt}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!canEdit || !body.trim() || saved} onClick={onSave} type="button">
            <Save className="h-4 w-4" />
            Salva modifiche
          </Button>
          {saved ? <Badge variant="success">Salvato ✓</Badge> : null}
        </div>
      </div>
    </section>
  );
}
