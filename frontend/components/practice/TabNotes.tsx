"use client";

import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/lib/demo-state";
import type { PracticePhase } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabNotesProps = {
  phases: PracticePhase[];
};

function avatarClass(userId: string) {
  if (userId.endsWith("0001")) return "bg-[#14532d]";
  if (userId.endsWith("0002")) return "bg-[#0f766e]";
  if (userId.endsWith("0003")) return "bg-[#ea580c]";
  return "bg-[#6b7280]";
}

export function TabNotes({ phases }: TabNotesProps) {
  const [body, setBody] = useState("");
  const activeUser = useDemoStore((state) => state.activeUser);
  const notes = useDemoStore((state) => state.notes);
  const applyAction = useDemoStore((state) => state.applyAction);
  const targetPhase = useMemo(
    () => phases.find((phase) => phase.status === "in_progress") ?? phases[0],
    [phases],
  );
  const sortedNotes = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const canEdit = activeUser.permission !== "viewer";

  function saveNote() {
    if (!targetPhase || !body.trim()) return;
    applyAction({ body: body.trim(), phaseId: targetPhase.id, type: "add_note" });
    setBody("");
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-border bg-surface-low p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Registro note</p>
            <h3 className="font-display text-xl font-semibold text-foreground">Conversazione operativa</h3>
          </div>
          <span className="text-sm text-muted">{sortedNotes.length} note</span>
        </div>
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <article className="rounded-2xl border border-border bg-surface-container p-4" key={note.id}>
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
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: it })}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-6 text-foreground-variant">{note.body}</p>
            </article>
          ))}
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-surface-low p-5">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Nuova nota</p>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-container p-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-bold text-white", avatarClass(activeUser.id))}>
            {activeUser.initials}
          </div>
          <div>
            <p className="font-semibold text-foreground">{activeUser.name}</p>
            <p className="text-xs text-muted">{targetPhase ? `Su: ${targetPhase.title}` : "Nessuna fase selezionata"}</p>
          </div>
        </div>
        <textarea
          className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-border bg-surface-container p-3 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50"
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
