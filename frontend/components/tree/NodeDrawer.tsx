"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  FileText,
  Lock,
  Pencil,
  Save,
  SkipForward,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ApiPracticeDetail } from "@/lib/api";
import { useDemoStore } from "@/lib/demo-state";
import type { TreeSelection } from "@/lib/types";
import { cn } from "@/lib/utils";

type NodeDrawerProps = {
  selection: TreeSelection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchTab: (tab: "allegati" | "note") => void;
};

export function NodeDrawer({ selection, open, onOpenChange, onSwitchTab }: NodeDrawerProps) {
  const [noteBody, setNoteBody] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [eventDraft, setEventDraft] = useState({
    authorId: "",
    description: "",
    occurredAt: "",
    title: "",
  });
  const [eventSaved, setEventSaved] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [phaseSaved, setPhaseSaved] = useState(false);

  function flashPhaseSaved() {
    setPhaseSaved(true);
    window.setTimeout(() => setPhaseSaved(false), 1500);
  }
  const queryClient = useQueryClient();
  const activeUser = useDemoStore((state) => state.activeUser);
  const users = useDemoStore((state) => state.users);
  const notes = useDemoStore((state) => state.notes);
  const applyAction = useDemoStore((state) => state.applyAction);

  const isPhase = selection?.kind === "phase";
  const title = isPhase ? selection.item.title : selection?.item.title;
  const description = isPhase ? selection.item.description : selection?.item.description;
  const assignee = isPhase ? selection.item.assignee : selection?.item.author;
  const date = isPhase ? selection.item.dueDate : selection?.item.occurredAt;
  const canEdit = activeUser.permission !== "viewer";
  const isAdmin = activeUser.permission === "admin";
  const phaseNotes = isPhase ? notes.filter((note) => note.phaseId === selection.item.id) : [];

  useEffect(() => {
    if (selection?.kind !== "event") return;
    setEventDraft({
      authorId: selection.item.author.id,
      description: selection.item.description,
      occurredAt: selection.item.occurredAt,
      title: selection.item.title,
    });
  }, [selection]);

  function avatarClass(userId?: string) {
    if (userId?.endsWith("0001")) return "bg-[#14532d]";
    if (userId?.endsWith("0002")) return "bg-[#0f766e]";
    if (userId?.endsWith("0003")) return "bg-[#ea580c]";
    return "bg-[#6b7280]";
  }

  function addNote() {
    if (!isPhase || !noteBody.trim()) return;
    applyAction({ type: "add_note", phaseId: selection.item.id, body: noteBody.trim() });
    setNoteBody("");
  }

  function startEditingNote(noteId: string, body: string) {
    setEditingNoteId(noteId);
    setEditingNoteBody(body);
  }

  function saveNoteEdit() {
    if (!editingNoteId || !editingNoteBody.trim() || noteSaved) return;
    applyAction({ type: "update_note", noteId: editingNoteId, body: editingNoteBody.trim() });
    queryClient.setQueriesData<ApiPracticeDetail>({ queryKey: ["practice-detail"] }, (detail) => {
      if (!detail) return detail;
      return {
        ...detail,
        notes: detail.notes.map((item) =>
          item.note.id === editingNoteId ? { ...item, note: { ...item.note, content: editingNoteBody.trim() } } : item,
        ),
      };
    });
    setEditingNoteId(null);
    setEditingNoteBody("");
    setNoteSaved(true);
    window.setTimeout(() => setNoteSaved(false), 2000);
  }

  function saveEventEdit() {
    if (selection?.kind !== "event" || !eventDraft.title.trim() || !eventDraft.occurredAt || eventSaved) return;
    const selectedAuthor = users.find((user) => user.id === eventDraft.authorId);
    const [nome = "", ...cognomeParts] = selectedAuthor?.name.split(" ") ?? [];
    applyAction({
      type: "update_event",
      authorId: eventDraft.authorId,
      description: eventDraft.description.trim(),
      eventId: selection.item.id,
      occurredAt: eventDraft.occurredAt,
      phaseId: selection.item.phaseId,
      title: eventDraft.title.trim(),
    });
    queryClient.setQueriesData<ApiPracticeDetail>({ queryKey: ["practice-detail"] }, (detail) => {
      if (!detail) return detail;
      return {
        ...detail,
        events: detail.events.map((item) =>
          item.event.id === selection.item.id
            ? {
                ...item,
                event: {
                  ...item.event,
                  author_id: eventDraft.authorId,
                  description: eventDraft.description.trim(),
                  event_date: eventDraft.occurredAt,
                  title: eventDraft.title.trim(),
                },
              }
            : item,
        ),
      };
    });
    queryClient.setQueriesData<ApiPracticeDetail>({ queryKey: ["practice-detail"] }, (detail) => {
      if (!detail || !selectedAuthor) return detail;
      return {
        ...detail,
        events: detail.events.map((item) =>
          item.event.id === selection.item.id
            ? {
                ...item,
                author: {
                  avatar_color: selectedAuthor.avatarColor,
                  cognome: cognomeParts.join(" "),
                  id: selectedAuthor.id,
                  initials: selectedAuthor.initials,
                  nome,
                  role: selectedAuthor.role,
                },
              }
            : item,
        ),
      };
    });
    setEventSaved(true);
    window.setTimeout(() => setEventSaved(false), 2000);
  }

  function switchTab(tab: "allegati" | "note") {
    onSwitchTab(tab);
    onOpenChange(false);
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent>
        <SheetHeader>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
            {isPhase ? `Fase ${selection.item.order} di 10 - Bilancio` : `Evento - ${selection?.phase.title}`}
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
            {isPhase ? (
              <div className="flex items-center gap-2">
                <select
                  className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canEdit}
                  onChange={(event) => {
                    applyAction({
                      type: "set_phase_status",
                      phaseId: selection.item.id,
                      status: event.target.value as typeof selection.item.status,
                    });
                    flashPhaseSaved();
                  }}
                  title={canEdit ? "Cambia stato fase (salvataggio automatico)" : "Permesso non disponibile per utente viewer"}
                  value={selection.item.status}
                >
                  <option value="pending">Da fare</option>
                  <option value="in_progress">In corso</option>
                  <option value="done">Completata</option>
                  <option value="skipped">Saltata</option>
                  <option value="blocked">Bloccata</option>
                </select>
                {phaseSaved ? <Badge variant="success">Salvato ✓</Badge> : null}
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Assegnatario
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-low p-3">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold text-white ring-2 ring-electric/25",
                  avatarClass(assignee?.id),
                )}
              >
                {assignee?.initials}
              </div>
              <div>
                <p className="font-semibold text-foreground">{assignee?.name}</p>
                <p className="text-xs text-muted">{assignee?.role}</p>
              </div>
            </div>
            {isPhase ? (
              <select
                className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isAdmin}
                onChange={(event) => {
                  applyAction({ type: "assign_phase", phaseId: selection.item.id, userId: event.target.value });
                  flashPhaseSaved();
                }}
                title={isAdmin ? "Assegna fase (salvataggio automatico)" : "Solo l'admin puo assegnare le fasi"}
                value={selection.item.assignee.id}
              >
                {users.map((user) => (
                  <option className="bg-surface text-foreground" key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            ) : null}
          </section>

          {!isPhase && selection?.kind === "event" ? (
            <section className="space-y-3">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Modifica evento
              </p>
              <div className="space-y-3 rounded-2xl border border-border bg-surface-low p-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted">Titolo</span>
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canEdit}
                    onChange={(event) => setEventDraft((draft) => ({ ...draft, title: event.target.value }))}
                    value={eventDraft.title}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted">Descrizione</span>
                  <textarea
                    className="min-h-24 w-full resize-none rounded-xl border border-border bg-surface-container p-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canEdit}
                    onChange={(event) => setEventDraft((draft) => ({ ...draft, description: event.target.value }))}
                    value={eventDraft.description}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted">Data</span>
                    <input
                      className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canEdit}
                      onChange={(event) => setEventDraft((draft) => ({ ...draft, occurredAt: event.target.value }))}
                      type="date"
                      value={eventDraft.occurredAt}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted">Autore</span>
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canEdit}
                      onChange={(event) => setEventDraft((draft) => ({ ...draft, authorId: event.target.value }))}
                      value={eventDraft.authorId}
                    >
                      {users.map((user) => (
                        <option className="bg-surface text-foreground" key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button disabled={!canEdit || !eventDraft.title.trim() || eventSaved} onClick={saveEventEdit} type="button">
                    <Save className="h-4 w-4" />
                    Salva modifiche
                  </Button>
                  {eventSaved ? <Badge variant="success">Salvato ✓</Badge> : null}
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Date</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-surface-low p-3">
                <CalendarDays className="mb-3 h-4 w-4 text-electric" />
                <p className="text-xs text-muted">{isPhase ? "Scadenza" : "Data evento"}</p>
                {isPhase ? (
                  <input
                    className="mt-2 h-9 w-full rounded-xl border border-border bg-surface-container px-3 font-label text-sm font-semibold text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canEdit}
                    onChange={(event) => {
                      applyAction({
                        type: "update_phase",
                        phaseId: selection.item.id,
                        planned_end: event.target.value,
                      });
                      flashPhaseSaved();
                    }}
                    title={canEdit ? "Modifica scadenza fase (salvataggio automatico)" : "Permesso non disponibile per utente viewer"}
                    type="date"
                    value={selection.item.dueDate}
                  />
                ) : (
                  <p className="font-label text-sm font-semibold text-foreground">
                    {date ? new Intl.DateTimeFormat("it-IT").format(new Date(date)) : "-"}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-surface-low p-3">
                <UserRound className="mb-3 h-4 w-4 text-electric" />
                <p className="text-xs text-muted">Owner</p>
                <p className="font-label text-sm font-semibold text-foreground">{assignee?.initials}</p>
              </div>
            </div>
          </section>

          {isPhase ? (
            <section className="space-y-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Note di questa fase
              </p>
              <div className="space-y-2">
                {phaseNotes.map((note) => {
                  const canEditNote = note.author.id === activeUser.id || isAdmin;
                  const isEditing = editingNoteId === note.id;
                  return (
                  <div className="rounded-2xl border border-border bg-surface-low p-3" key={note.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-label text-xs font-semibold text-foreground">{note.author.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted">
                          {new Intl.DateTimeFormat("it-IT", {
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "2-digit",
                          }).format(new Date(note.createdAt))}
                        </span>
                        {canEditNote ? (
                          <button
                            aria-label="Modifica nota"
                            className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-high hover:text-foreground"
                            onClick={() => startEditingNote(note.id, note.body)}
                            type="button"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          className="min-h-20 w-full resize-none rounded-xl border border-border bg-surface-container p-3 text-sm text-foreground outline-none"
                          onChange={(event) => setEditingNoteBody(event.target.value)}
                          value={editingNoteBody}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button disabled={!editingNoteBody.trim() || noteSaved} onClick={saveNoteEdit} size="sm" type="button">
                            Salva
                          </Button>
                          <Button onClick={() => setEditingNoteId(null)} size="sm" type="button" variant="ghost">
                            Annulla
                          </Button>
                          {noteSaved ? <Badge variant="success">Salvato ✓</Badge> : null}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-5 text-foreground-variant">{note.body}</p>
                    )}
                  </div>
                );
                })}
                {noteSaved && editingNoteId === null ? <Badge variant="success">Salvato ✓</Badge> : null}
              </div>
              <textarea
                className="min-h-20 w-full resize-none rounded-2xl border border-border bg-surface-low p-3 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEdit}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder={canEdit ? "Aggiungi una nota operativa..." : "Permesso non disponibile per utente viewer"}
                title={canEdit ? "Nota locale demo" : "Permesso non disponibile per utente viewer"}
                value={noteBody}
              />
              <Button disabled={!canEdit || !noteBody.trim()} onClick={addNote} type="button" variant="outline">
                <FileText className="h-4 w-4" />
                Aggiungi nota
              </Button>
            </section>
          ) : null}

          {isPhase ? (
            <div className="mt-auto grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
              <Button
                disabled={!canEdit}
                onClick={() => {
                  applyAction({ type: "complete_phase", phaseId: selection.item.id });
                  flashPhaseSaved();
                }}
                title={canEdit ? "Completa fase" : "Permesso non disponibile per utente viewer"}
                type="button"
              >
                <Check className="h-4 w-4" />
                Completa
              </Button>
              <Button
                disabled={!canEdit}
                onClick={() => {
                  applyAction({ type: "skip_phase", phaseId: selection.item.id });
                  flashPhaseSaved();
                }}
                title={canEdit ? "Salta fase" : "Permesso non disponibile per utente viewer"}
                type="button"
                variant="warning"
              >
                <SkipForward className="h-4 w-4" />
                Salta
              </Button>
              {!canEdit ? (
                <p className="col-span-full flex items-center gap-2 text-xs text-muted">
                  <Lock className="h-3.5 w-3.5" />
                  Utente viewer: azioni disponibili solo in lettura.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
