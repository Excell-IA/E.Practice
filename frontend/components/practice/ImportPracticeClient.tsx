"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Sparkles, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { V1Hint } from "@/components/ui/v1-hint";
import {
  attachAttachment,
  deleteAttachment,
  getPractices,
  uploadAttachment,
  type ApiAttachment,
} from "@/lib/api";
import { useDemoStore } from "@/lib/demo-state";
import { mapApiPracticeToDirectoryPractice } from "@/lib/mappers/practice-list";

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
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const activeUser = useDemoStore((state) => state.activeUser);
  const router = useRouter();
  const queryClient = useQueryClient();

  const practicesQuery = useQuery({
    enabled: attachDialogOpen,
    queryFn: () => getPractices(),
    queryKey: ["practices"],
  });

  const allPractices = useMemo(() => {
    return practicesQuery.data?.items.map(mapApiPracticeToDirectoryPractice) ?? [];
  }, [practicesQuery.data?.items]);

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allPractices) {
      if (!map.has(p.clientId)) map.set(p.clientId, p.clientName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
  }, [allPractices]);

  const practiceOptions = useMemo(() => {
    const filtered = selectedClientId
      ? allPractices.filter((p) => p.clientId === selectedClientId)
      : allPractices;
    return [...filtered].sort((a, b) => b.code.localeCompare(a.code));
  }, [allPractices, selectedClientId]);

  const selectedPractice = useMemo(
    () => practiceOptions.find((p) => p.id === selectedPracticeId) ?? null,
    [practiceOptions, selectedPracticeId],
  );

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

  async function attachToPractice(practiceId: string, practiceCode: string) {
    if (!rows.length) return;
    setIsAttaching(true);
    setAttachError(null);
    try {
      await Promise.all(
        rows.map((row) => attachAttachment(row.id, practiceId, null, activeUser.id)),
      );
      await queryClient.invalidateQueries({ queryKey: ["attachments"] });
      await queryClient.invalidateQueries({ queryKey: ["practice-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["practices"] });
      setAttachDialogOpen(false);
      router.push(`/pratiche/${practiceCode}`);
    } catch (err) {
      console.error("attach_to_practice_failed", err);
      setAttachError(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setIsAttaching(false);
    }
  }

  const newPracticeHref =
    rows.length > 0 ? `/pratiche/nuova?attachments=${rows.map((row) => row.id).join(",")}` : "/pratiche/nuova";

  return (
    <main className="min-h-[calc(100vh-120px)] bg-surface">
      <header className="border-b border-border bg-surface-low/80 px-6 py-[14px] md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <HelpButton title="Nuovo documento" subtitle="Carica file e crea o aggiorna una pratica">
            <section>
              <p>Trascina o seleziona uno o piu file. Una volta caricati scegli cosa farne:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Crea una nuova pratica</strong>: apre il wizard con gli allegati gia pre-caricati nello step 2.</li>
                <li><strong className="text-foreground">Allega a una pratica esistente</strong>: scegli cliente e pratica dal pannello laterale.</li>
              </ul>
            </section>
            <section>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Lettore AI</p>
              <p className="mt-2">
                Il <strong className="text-foreground">Lettore AI</strong> (in arrivo nella V1) legge i documenti caricati e propone i dati per la pratica, sempre con la tua supervisione. Meno digitazione manuale.
              </p>
            </section>
          </HelpButton>
          <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            Nuovo documento
          </h1>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-[10px] md:px-10 lg:grid-cols-[1fr_1.1fr]">
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
              <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-variant">
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
                <p className="px-2 py-4 text-center text-sm leading-6 text-foreground-variant">
                  Carica almeno un documento per generare una nuova pratica o allegarlo a una pratica esistente.
                </p>
              ) : (
                <>
                  <Button asChild className="w-full">
                    <Link href={newPracticeHref}>Crea una nuova pratica con questi allegati</Link>
                  </Button>
                  <Button
                    className="w-full !bg-electric/30 !text-[var(--on-primary)] !shadow-none border border-electric/50 hover:!bg-electric/40"
                    onClick={() => setAttachDialogOpen(true)}
                    type="button"
                  >
                    Allega a una pratica esistente
                  </Button>
                </>
              )}
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
                <div className="rounded-xl border border-dashed border-border bg-surface-container p-4 text-base leading-7 text-foreground-variant">
                  <p className="font-semibold text-foreground">Lettore AI dei documenti</p>
                  <p className="mt-1">
                    Con questo tool la AI farà una lettura completa del documento e la confronterà con i dati del
                    database per cercare di sfruttare le informazioni disponibili e velocizzare la compilazione della
                    pratica. Sempre sotto la supervisione dell&apos;utente.
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
                <p className="rounded-xl border border-dashed border-border bg-surface-container px-3 py-4 text-center text-sm text-foreground-variant">
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

      <Sheet
        onOpenChange={(open) => {
          setAttachDialogOpen(open);
          if (!open) {
            setSelectedClientId("");
            setSelectedPracticeId("");
            setAttachError(null);
          }
        }}
        open={attachDialogOpen}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Allega a una pratica esistente</SheetTitle>
            <SheetDescription>
              Seleziona la pratica a cui collegare{" "}
              {rows.length === 1 ? "il documento caricato" : `i ${rows.length} documenti caricati`}.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-label text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="attach-client">
                Cliente
              </label>
              <select
                className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm text-foreground outline-none focus:border-electric"
                disabled={isAttaching || practicesQuery.isLoading}
                id="attach-client"
                onChange={(event) => {
                  setSelectedClientId(event.target.value);
                  setSelectedPracticeId("");
                }}
                value={selectedClientId}
              >
                <option value="">Tutti i clienti</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-label text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="attach-practice">
                Pratica {practiceOptions.length ? `(${practiceOptions.length})` : ""}
              </label>
              <select
                className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm text-foreground outline-none focus:border-electric disabled:opacity-50"
                disabled={isAttaching || practicesQuery.isLoading || practiceOptions.length === 0}
                id="attach-practice"
                onChange={(event) => setSelectedPracticeId(event.target.value)}
                value={selectedPracticeId}
              >
                <option value="">
                  {practicesQuery.isLoading
                    ? "Caricamento…"
                    : practiceOptions.length === 0
                      ? "Nessuna pratica disponibile"
                      : "Seleziona una pratica"}
                </option>
                {practiceOptions.map((practice) => (
                  <option key={practice.id} value={practice.id}>
                    {practice.code} — {practice.title}
                    {selectedClientId ? "" : ` (${practice.clientName})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {attachError ? (
            <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              {attachError}
            </p>
          ) : null}

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <Button
              className="w-full"
              disabled={!selectedPractice || isAttaching}
              onClick={() => {
                if (selectedPractice) attachToPractice(selectedPractice.id, selectedPractice.code);
              }}
              type="button"
            >
              {isAttaching ? "Allego i documenti…" : "Allega"}
            </Button>
            <Button
              className="w-full"
              disabled={isAttaching}
              onClick={() => setAttachDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Annulla
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
