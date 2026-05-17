"use client";

import { format, formatDistanceToNow, isAfter, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDemoStore, type DemoNote } from "@/lib/demo-state";
import type { PracticePhase } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabNotesProps = {
  phases: PracticePhase[];
  focusNoteId?: string | null;
  onFocusApplied?: () => void;
};

type EditableNote = DemoNote & {
  occurredAt?: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function avatarClass(userId: string) {
  if (userId.endsWith("0001")) return "bg-[#14532d]";
  if (userId.endsWith("0002")) return "bg-[#0f766e]";
  if (userId.endsWith("0003")) return "bg-[#ea580c]";
  return "bg-[#6b7280]";
}

function noteDate(note: DemoNote) {
  const editableNote = note as EditableNote;
  return editableNote.occurredAt ?? note.createdAt.slice(0, 10);
}

function persistNotes(notes: DemoNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("epractice:notes", JSON.stringify(notes));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function updateNoteOnApi(noteId: string, body: string, occurredAt: string, userId: string) {
  if (!isUuid(noteId)) return;
  const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
    body: JSON.stringify({ body, occurred_at: occurredAt }),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Errore update nota: ${response.status}`);
  }
}

async function deleteNoteOnApi(noteId: string, userId: string) {
  if (!isUuid(noteId)) return;
  const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
    headers: {
      "Accept": "application/json",
      "X-User-Id": userId,
    },
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Errore delete nota: ${response.status}`);
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function TabNotes({ phases, focusNoteId, onFocusApplied }: TabNotesProps) {
  const [body, setBody] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(todayIsoDate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingDate, setEditingDate] = useState("");
  const activeUser = useDemoStore((state) => state.activeUser);
  const notes = useDemoStore((state) => state.notes);
  const applyAction = useDemoStore((state) => state.applyAction);
  // intentionally not deriving a target phase: notes are free-standing on the practice timeline.
  void phases;
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(noteDate(a)).getTime() - new Date(noteDate(b)).getTime()),
    [notes],
  );
  const canEdit = activeUser.permission !== "viewer";

  // Anchor: nota più recente fino a oggi compreso
  const todayDate = startOfDay(new Date());
  const anchorId = useMemo(() => {
    let anchor: DemoNote | null = null;
    for (const note of sortedNotes) {
      const d = new Date(noteDate(note));
      if (!isAfter(startOfDay(d), todayDate)) anchor = note;
    }
    return anchor?.id ?? null;
  }, [sortedNotes, todayDate]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollContainerRef.current || !anchorRef.current) return;
    const container = scrollContainerRef.current;
    const anchor = anchorRef.current;
    const offset = anchor.offsetTop - container.offsetTop - 12;
    container.scrollTop = offset > 0 ? offset : 0;
  }, [anchorId]);

  // Focus da albero: scrolla alla nota cliccata e attiva edit
  useEffect(() => {
    if (!focusNoteId) return;
    const target = sortedNotes.find((n) => n.id === focusNoteId);
    if (!target) return;
    setEditingId(target.id);
    setEditingBody(target.body);
    setEditingDate(noteDate(target));
    window.setTimeout(() => {
      const el = document.getElementById(`note-${target.id}`);
      if (el && scrollContainerRef.current) {
        const offset = el.offsetTop - scrollContainerRef.current.offsetTop - 12;
        scrollContainerRef.current.scrollTop = offset > 0 ? offset : 0;
      }
    }, 60);
    onFocusApplied?.();
  }, [focusNoteId, sortedNotes, onFocusApplied]);

  function saveNote() {
    if (!body.trim()) return;
    applyAction({
      body: body.trim(),
      occurredAt: newNoteDate || todayIsoDate(),
      type: "add_note",
    });
    setBody("");
    setNewNoteDate(todayIsoDate());
  }

  function startEditing(note: DemoNote) {
    setEditingId(note.id);
    setEditingBody(note.body);
    setEditingDate(noteDate(note));
  }

  async function saveEdit() {
    if (!editingId || !editingBody.trim() || !editingDate) return;
    const currentNotes = useDemoStore.getState().notes;
    const updatedNotes = currentNotes.map((note) =>
      note.id === editingId ? ({ ...note, body: editingBody.trim(), occurredAt: editingDate } satisfies EditableNote) : note,
    );
    useDemoStore.setState({ notes: updatedNotes });
    persistNotes(updatedNotes);
    void updateNoteOnApi(editingId, editingBody.trim(), editingDate, activeUser.id).catch(console.warn);
    setEditingId(null);
    setEditingBody("");
    setEditingDate("");
  }

  function deleteNote(noteId: string) {
    const confirmed = window.confirm("Eliminare questa nota?");
    if (!confirmed) return;
    const updatedNotes = useDemoStore.getState().notes.filter((note) => note.id !== noteId);
    useDemoStore.setState({ notes: updatedNotes });
    persistNotes(updatedNotes);
    void deleteNoteOnApi(noteId, activeUser.id).catch(console.warn);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5 lg:flex-row">
      <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-surface-low p-5 lg:flex-1">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Registro note</p>
            <h3 className="font-display text-xl font-semibold text-foreground">Conversazione operativa</h3>
          </div>
          <span className="text-sm text-muted">{sortedNotes.length} note</span>
        </div>
        <div className="space-y-3 lg:flex-1 lg:overflow-y-auto lg:pr-1" ref={scrollContainerRef}>
          {sortedNotes.map((note) => {
            const canEditNote = note.author.id === activeUser.id || activeUser.permission === "admin";
            const isEditing = editingId === note.id;
            const visibleDate = noteDate(note);
            return (
            <article
              className={cn(
                "rounded-2xl border bg-surface-container p-4",
                isEditing ? "border-electric/60 bg-electric/5" : "border-border",
              )}
              id={`note-${note.id}`}
              key={note.id}
              ref={note.id === anchorId ? anchorRef : undefined}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-bold text-white",
                    avatarClass(note.author.id),
                  )}
                >
                  {note.author.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-label text-sm font-semibold text-foreground">{note.author.name}</p>
                  <p className="text-xs text-muted">
                    {format(new Date(visibleDate), "dd MMM yyyy", { locale: it })} ·{" "}
                    {formatDistanceToNow(new Date(visibleDate), { addSuffix: true, locale: it })}
                  </p>
                </div>
                {canEditNote ? (
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Modifica nota"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-high hover:text-foreground"
                      onClick={() => startEditing(note)}
                      type="button"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Elimina nota"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      onClick={() => deleteNote(note.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted">Data nota</span>
                    <input
                      className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm text-foreground outline-none"
                      lang="it-IT"
                      onChange={(event) => setEditingDate(event.target.value)}
                      type="date"
                      value={editingDate}
                    />
                  </label>
                  <textarea
                    className="min-h-24 w-full resize-none rounded-xl border border-border bg-surface-low p-3 text-sm text-foreground outline-none"
                    onChange={(event) => setEditingBody(event.target.value)}
                    value={editingBody}
                  />
                  <div className="flex gap-2">
                    <Button disabled={!editingBody.trim()} onClick={saveEdit} size="sm" type="button">
                      Salva
                    </Button>
                    <Button onClick={() => setEditingId(null)} size="sm" type="button" variant="ghost">
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-foreground-variant">{note.body}</p>
              )}
            </article>
          );
          })}
        </div>
      </div>

      <aside className="shrink-0 rounded-2xl border border-border bg-surface-low p-5 lg:w-[360px] lg:overflow-y-auto">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Nuova nota</p>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-container p-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-bold text-white", avatarClass(activeUser.id))}>
            {activeUser.initials}
          </div>
          <div>
            <p className="font-semibold text-foreground">{activeUser.name}</p>
            <p className="text-xs text-muted">Nota generale della pratica</p>
          </div>
        </div>
        <label className="mt-4 block space-y-1.5">
          <span className="text-xs font-semibold text-muted">Data nota</span>
          <input
            className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
            lang="it-IT"
            onChange={(event) => setNewNoteDate(event.target.value)}
            type="date"
            value={newNoteDate}
          />
        </label>
        <textarea
          className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-border bg-surface-container p-3 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canEdit}
          onChange={(event) => setBody(event.target.value)}
          placeholder={canEdit ? "Scrivi una nota visibile al team..." : "Utente in sola lettura"}
          value={body}
        />
        <Button className="mt-3 w-full" disabled={!canEdit || !body.trim()} onClick={saveNote} type="button">
          <FileText className="h-4 w-4" />
          Salva nota
        </Button>
      </aside>
    </section>
  );
}
