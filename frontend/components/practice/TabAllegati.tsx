"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { V1Hint } from "@/components/ui/v1-hint";
import { attachAttachment, deleteAttachment, listAttachments, uploadAttachment } from "@/lib/api";
import { DEMO_USERS, useDemoStore } from "@/lib/demo-state";
import type { Practice, PracticePhase } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabAllegatiProps = {
  practice: Practice;
  phases: PracticePhase[];
};

function avatarClass(userId: string) {
  if (userId.endsWith("0001")) return "bg-[#14532d]";
  if (userId.endsWith("0002")) return "bg-[#0f766e]";
  if (userId.endsWith("0003")) return "bg-[#ea580c]";
  return "bg-[#6b7280]";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

export function TabAllegati({ phases, practice }: TabAllegatiProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeUser = useDemoStore((state) => state.activeUser);
  const queryClient = useQueryClient();
  const attachmentsQuery = useQuery({
    queryFn: () => listAttachments(practice.id),
    queryKey: ["attachments", practice.id],
  });

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    setIsUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const uploaded = await uploadAttachment(file, activeUser.id);
        await attachAttachment(uploaded.id, practice.id, null, activeUser.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["attachments", practice.id] });
      await queryClient.invalidateQueries({ queryKey: ["practice-detail", practice.id] });
    } catch (err) {
      console.error("practice_attachment_upload_failed", err);
      setError(err instanceof Error ? err.message : "Upload allegato non riuscito.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAttachment(id: string, filename: string) {
    if (!window.confirm(`Eliminare ${filename}?`)) return;
    setError(null);
    try {
      await deleteAttachment(id, activeUser.id);
      await queryClient.invalidateQueries({ queryKey: ["attachments", practice.id] });
      await queryClient.invalidateQueries({ queryKey: ["practice-detail", practice.id] });
    } catch (err) {
      console.error("practice_attachment_delete_failed", err);
      setError(err instanceof Error ? err.message : "Eliminazione allegato non riuscita.");
    }
  }

  const attachments = attachmentsQuery.data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-surface-low p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Allegati</p>
          <h3 className="font-display text-xl font-semibold text-foreground">Documenti pratica</h3>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border border-dashed border-electric/35 bg-electric/5 px-4 py-3 text-sm font-semibold text-electric",
            isDragging && "bg-electric/15",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
        >
          <UploadCloud className="h-4 w-4" />
          <button disabled={isUploading} onClick={() => inputRef.current?.click()} type="button">
            {isUploading ? "Caricamento..." : "Trascina qui per allegare"}
          </button>
          <input
            className="hidden"
            multiple
            onChange={(event) => void addFiles(event.target.files)}
            ref={inputRef}
            type="file"
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-y-2 text-left">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">File</th>
              <th className="px-3 py-2 font-semibold">Dimensione</th>
              <th className="px-3 py-2 font-semibold">Fase</th>
              <th className="px-3 py-2 font-semibold">Autore</th>
              <th className="px-3 py-2 font-semibold">Data</th>
              <th className="px-3 py-2 text-right font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((attachment) => {
              const author = DEMO_USERS.find((user) => user.id === attachment.uploaded_by) ?? DEMO_USERS[0];
              const phase = phases.find((item) => item.id === attachment.phase_id);
              return (
                <tr className="rounded-2xl bg-surface-container text-sm text-foreground-variant" key={attachment.id}>
                  <td className="rounded-l-2xl px-3 py-3">
                    <span className="flex items-center gap-2 font-mono text-xs text-foreground">
                      <FileText className="h-4 w-4 text-electric" />
                      {attachment.filename}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Badge>{formatSize(attachment.size_bytes)}</Badge>
                  </td>
                  <td className="px-3 py-3">{phase?.title ?? "Pratica"}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
                          avatarClass(author.id),
                        )}
                      >
                        {author.initials}
                      </span>
                      {author.name}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {new Intl.DateTimeFormat("it-IT").format(new Date(attachment.created_at))}
                  </td>
                  <td className="rounded-r-2xl px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <V1Hint label="Disponibile in V1">
                        <Button size="sm" type="button" variant="outline">
                          <Download className="h-4 w-4" />
                          Scarica
                        </Button>
                      </V1Hint>
                      <Button
                        aria-label={`Elimina ${attachment.filename}`}
                        onClick={() => void removeAttachment(attachment.id, attachment.filename)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!attachments.length && !attachmentsQuery.isLoading ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-container px-3 py-4 text-center text-sm text-muted">
          Nessun allegato collegato alla pratica.
        </p>
      ) : null}
    </section>
  );
}
