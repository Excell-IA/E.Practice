"use client";

import { FileSpreadsheet, Sparkles, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { V1Hint } from "@/components/ui/v1-hint";
import { deleteAttachment, uploadAttachment, type ApiAttachment } from "@/lib/api";
import { useDemoStore } from "@/lib/demo-state";

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

export function ImportPracticeClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ApiAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeUser = useDemoStore((state) => state.activeUser);

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadAttachment(file, activeUser.id)));
      setRows((current) => [...uploaded, ...current]);
    } catch (err) {
      console.error("attachment_upload_failed", err);
      setError(err instanceof Error ? err.message : "Upload non riuscito. Verifica che il backend sia acceso.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeRow(id: string) {
    setError(null);
    try {
      await deleteAttachment(id, activeUser.id);
      setRows((current) => current.filter((row) => row.id !== id));
    } catch (err) {
      console.error("attachment_delete_failed", err);
      setError(err instanceof Error ? err.message : "Rimozione non riuscita.");
    }
  }

  const newPracticeHref =
    rows.length > 0 ? `/pratiche/nuova?attachments=${rows.map((row) => row.id).join(",")}` : "/pratiche/nuova";

  return (
    <main className="min-h-[calc(100vh-120px)] bg-surface">
      <header className="border-b border-border bg-surface-low/80 px-6 py-[14px] md:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            Carica documento
          </h1>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-[10px] md:px-10 lg:grid-cols-2">
        <Card
          className={isDragging ? "border-electric bg-electric/10" : undefined}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <CardContent className="flex min-h-[520px] flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-electric/10 text-electric">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Trascina qui un file</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                Puoi selezionare anche più file alla volta. Il caricamento crea allegati reali nel backend demo.
              </p>
            </div>
            {error ? (
              <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <input
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              multiple
              onChange={(event) => addFiles(event.target.files)}
              ref={inputRef}
              type="file"
            />
            <Button disabled={isUploading} onClick={() => inputRef.current?.click()} type="button">
              <FileSpreadsheet className="h-4 w-4" />
              {isUploading ? "Caricamento..." : "Seleziona file"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-3 pt-6">
              {rows.length === 0 ? (
                <Button className="w-full" disabled type="button">
                  Apri Nuova pratica
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href={newPracticeHref}>Apri Nuova pratica</Link>
                </Button>
              )}
              <V1Hint className="w-full">
                <Button
                  className="w-full bg-gradient-to-r from-[#3a5f8f] to-[#5078b8] text-white hover:from-[#456ea3] hover:to-[#5d8ace]"
                  type="button"
                >
                  Allega a pratica esistente
                </Button>
              </V1Hint>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-electric" />
                Lettore AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <V1Hint className="w-full">
                <div className="rounded-xl border border-dashed border-border bg-surface-container p-4 text-sm leading-6 text-muted">
                  <p className="font-semibold text-foreground">Componente da sviluppare</p>
                  <p className="mt-1">
                    Attiva il componente di lettura documento con intelligenza artificiale per la lettura
                    automatica dei dati del documento.
                  </p>
                </div>
              </V1Hint>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File caricati ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-surface-container px-3 py-4 text-center text-sm text-muted">
                  Nessun file ancora caricato.
                </p>
              ) : (
                <div className="max-h-[min(60vh,400px)] space-y-2 overflow-y-auto pr-1">
                  {rows.map((row) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-container px-3 py-2"
                      key={row.id}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-label text-sm font-semibold text-foreground">{row.filename}</p>
                        <p className="text-xs text-muted">caricato {formatUploadedAt(row.created_at)}</p>
                      </div>
                      <button
                        aria-label={`Rimuovi ${row.filename}`}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-high hover:text-foreground"
                        onClick={() => removeRow(row.id)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
