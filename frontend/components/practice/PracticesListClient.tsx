"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronDown, FileText, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/ui/help-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { deletePractice, getPractices, listAttachments, type ApiAttachment } from "@/lib/api";
import { directoryPractices, type DirectoryPractice } from "@/lib/demo-directory";
import { useDemoStore } from "@/lib/demo-state";
import { mapApiPracticeToDirectoryPractice } from "@/lib/mappers/practice-list";
import { cn } from "@/lib/utils";

type ColumnFilterKey = "status" | "category" | "responsible" | "client";

const ALL_VALUE = "__all__";

function statusLabel(status: DirectoryPractice["status"]) {
  if (status === "aperta") return "Aperta";
  if (status === "in_corso") return "In corso";
  if (status === "in_attesa") return "In attesa";
  if (status === "sospesa") return "Sospesa";
  return "Chiusa";
}

function statusVariant(status: DirectoryPractice["status"]): BadgeProps["variant"] {
  if (status === "chiusa") return "success";
  if (status === "sospesa" || status === "in_attesa") return "warning";
  return "info";
}

function categoryVariant(color: string): BadgeProps["variant"] {
  if (color === "danger") return "danger";
  if (color === "warning") return "warning";
  if (color === "success") return "success";
  return "info";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ColumnFilterDropdownProps = {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

function ColumnFilterDropdown({ label, options, value, onChange }: ColumnFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const active = value !== ALL_VALUE;
  const currentLabel = active ? options.find((opt) => opt.value === value)?.label ?? label : label;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        aria-label={`Filtra per ${label}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors",
          "font-display text-[11px] uppercase tracking-[0.14em]",
          active ? "bg-electric/15 text-electric" : "text-muted hover:text-foreground",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-border bg-surface-container shadow-lg">
          <ul className="max-h-72 overflow-y-auto py-1 text-xs normal-case tracking-normal">
            <li>
              <button
                className={cn(
                  "block w-full px-3 py-1.5 text-left transition-colors hover:bg-surface-high",
                  value === ALL_VALUE && "bg-surface-high text-electric",
                )}
                onClick={() => {
                  onChange(ALL_VALUE);
                  setOpen(false);
                }}
                type="button"
              >
                Tutti
              </button>
            </li>
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  className={cn(
                    "block w-full px-3 py-1.5 text-left transition-colors hover:bg-surface-high",
                    value === opt.value && "bg-surface-high text-electric",
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PracticesListClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeUser = useDemoStore((state) => state.activeUser);
  const [query, setQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<ColumnFilterKey, string>>({
    category: ALL_VALUE,
    client: ALL_VALUE,
    responsible: ALL_VALUE,
    status: ALL_VALUE,
  });
  const [attachmentsPractice, setAttachmentsPractice] = useState<DirectoryPractice | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const practicesQuery = useQuery({
    queryFn: () => getPractices(),
    queryKey: ["practices"],
  });
  const attachmentsQuery = useQuery({
    queryFn: () => listAttachments(),
    queryKey: ["attachments-all"],
  });
  const sourcePractices = useMemo(() => {
    const apiPractices = practicesQuery.data?.items.map(mapApiPracticeToDirectoryPractice) ?? [];
    return apiPractices.length ? apiPractices : directoryPractices;
  }, [practicesQuery.data?.items]);
  const attachmentsByPracticeId = useMemo(() => {
    const map = new Map<string, ApiAttachment[]>();
    for (const att of attachmentsQuery.data ?? []) {
      if (!att.practice_id) continue;
      const list = map.get(att.practice_id) ?? [];
      list.push(att);
      map.set(att.practice_id, list);
    }
    return map;
  }, [attachmentsQuery.data]);
  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const practice of sourcePractices) seen.set(practice.status, statusLabel(practice.status));
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [sourcePractices]);
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const practice of sourcePractices) seen.add(practice.category);
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "it")).map((name) => ({ value: name, label: name }));
  }, [sourcePractices]);
  const responsibleOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const practice of sourcePractices) seen.add(practice.responsible.name);
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "it")).map((name) => ({ value: name, label: name }));
  }, [sourcePractices]);
  const clientOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const practice of sourcePractices) seen.add(practice.clientName);
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "it")).map((name) => ({ value: name, label: name }));
  }, [sourcePractices]);

  function matchesColumnFilters(practice: DirectoryPractice) {
    if (columnFilters.status !== ALL_VALUE && practice.status !== columnFilters.status) return false;
    if (columnFilters.category !== ALL_VALUE && practice.category !== columnFilters.category) return false;
    if (columnFilters.responsible !== ALL_VALUE && practice.responsible.name !== columnFilters.responsible) return false;
    if (columnFilters.client !== ALL_VALUE && practice.clientName !== columnFilters.client) return false;
    return true;
  }

  const practices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sourcePractices.filter((practice) => {
      const text = `${practice.code} ${practice.title} ${practice.clientName}`.toLowerCase();
      return matchesColumnFilters(practice) && (!needle || text.includes(needle));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters, query, sourcePractices]);

  function setFilter(key: ColumnFilterKey, value: string) {
    setColumnFilters((current) => ({ ...current, [key]: value }));
  }

  async function removePractice(practice: DirectoryPractice) {
    if (!window.confirm(`Eliminare la pratica ${practice.code} (${practice.title})?\n\nL'azione è irreversibile e cancella anche fasi, eventi, note e allegati collegati.`)) return;
    setDeletingId(practice.id);
    try {
      await deletePractice(practice.id, activeUser.id);
      await queryClient.invalidateQueries({ queryKey: ["practices"] });
      await queryClient.invalidateQueries({ queryKey: ["attachments-all"] });
    } catch (err) {
      console.error("delete_practice_failed", err);
      window.alert("Eliminazione non riuscita. Riprova.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-surface px-6 py-6 md:px-10">
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <HelpButton title="Elenco pratiche" subtitle="Come orientarsi in questa schermata">
              <section>
                <p>L&apos;elenco mostra tutte le pratiche dello studio. Usa i <strong className="text-foreground">filtri a dropdown</strong> sui titoli di colonna (Stato, Categoria, Responsabile, Cliente) o la <strong className="text-foreground">ricerca</strong> per nome cliente o codice.</p>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Colonne</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li><strong className="text-foreground">Scadenza</strong>: la data + i giorni rimanenti. Rosso = già scaduta, arancio = scade entro 7 giorni.</li>
                  <li><strong className="text-foreground">Documenti</strong>: click sull&apos;icona se ci sono allegati → si apre la lista completa.</li>
                  <li><strong className="text-foreground">Progress</strong>: percentuale di fasi completate.</li>
                  <li><strong className="text-foreground">Cestino</strong> a destra: elimina pratica (con conferma).</li>
                </ul>
              </section>
              <section>
                <p>Click su una riga → apri il dettaglio della pratica. Click su <strong className="text-foreground">+ Nuova pratica</strong> in alto a destra → wizard di creazione.</p>
              </section>
            </HelpButton>
            <h1 className="font-display text-3xl font-semibold text-foreground">Elenco pratiche</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="relative w-full max-w-sm sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="h-10 w-full rounded-xl border border-border bg-surface-low pl-9 pr-3 text-sm text-foreground outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca pratica o cliente"
                value={query}
              />
            </label>
            <Button asChild>
              <Link href="/pratiche/nuova">
                <Plus className="h-4 w-4" />
                Nuova pratica
              </Link>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface-low">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead className="bg-surface-container text-left font-display text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Titolo</th>
                <th className="px-2 py-3">
                  <ColumnFilterDropdown
                    label="Cliente"
                    onChange={(value) => setFilter("client", value)}
                    options={clientOptions}
                    value={columnFilters.client}
                  />
                </th>
                <th className="px-2 py-3">
                  <ColumnFilterDropdown
                    label="Categoria"
                    onChange={(value) => setFilter("category", value)}
                    options={categoryOptions}
                    value={columnFilters.category}
                  />
                </th>
                <th className="px-2 py-3">
                  <ColumnFilterDropdown
                    label="Responsabile"
                    onChange={(value) => setFilter("responsible", value)}
                    options={responsibleOptions}
                    value={columnFilters.responsible}
                  />
                </th>
                <th className="px-4 py-3">Scadenza</th>
                <th className="px-2 py-3">
                  <ColumnFilterDropdown
                    label="Stato"
                    onChange={(value) => setFilter("status", value)}
                    options={statusOptions}
                    value={columnFilters.status}
                  />
                </th>
                <th className="px-4 py-3">Documenti</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {practices.map((practice) => {
                const href = `/pratiche/${practice.code}`;
                return (
                  <tr
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-container"
                    key={practice.id}
                    onClick={() => router.push(href)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(href);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="px-4 py-3">
                      <Link
                        className="font-label text-xs font-bold text-electric"
                        href={href}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {practice.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-foreground"
                        href={href}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {practice.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground-variant">{practice.clientName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={categoryVariant(practice.categoryColor)}>{practice.category}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                          style={{ backgroundColor: practice.responsible.color }}
                        >
                          {practice.responsible.initials}
                        </span>
                        <span className="text-foreground-variant">{practice.responsible.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-label text-foreground-variant">{format(new Date(practice.dueDate), "dd/MM/yyyy", { locale: it })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(practice.status)}>{statusLabel(practice.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const docs = attachmentsByPracticeId.get(practice.id) ?? [];
                        const hasDocs = docs.length > 0;
                        return (
                          <button
                            aria-label={hasDocs ? `${docs.length} documenti — apri elenco` : "Nessun documento"}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors",
                              hasDocs
                                ? "text-electric hover:bg-electric/10 cursor-pointer"
                                : "text-muted cursor-default",
                            )}
                            disabled={!hasDocs}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (hasDocs) setAttachmentsPractice(practice);
                            }}
                            title={hasDocs ? `${docs.length} documenti — clicca per aprire` : "Nessun documento"}
                            type="button"
                          >
                            <FileText className="h-4 w-4" />
                            {hasDocs ? (
                              <span className="font-label text-xs font-semibold">{docs.length}</span>
                            ) : null}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-high">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${practice.progress}%` }} />
                        </div>
                        <span className="font-label whitespace-nowrap text-xs font-semibold text-muted">
                          {practice.phasesClosed}/{practice.phasesTotal} &middot; {practice.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        aria-label={`Elimina pratica ${practice.code}`}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger",
                          deletingId === practice.id && "cursor-wait opacity-50",
                        )}
                        disabled={deletingId === practice.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void removePractice(practice);
                        }}
                        title="Elimina pratica"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet onOpenChange={(open) => !open && setAttachmentsPractice(null)} open={attachmentsPractice !== null}>
        <SheetContent>
          {attachmentsPractice ? (
            <>
              <SheetHeader>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
                  Documenti pratica {attachmentsPractice.code}
                </p>
                <SheetTitle>{attachmentsPractice.title}</SheetTitle>
                <SheetDescription>
                  Cliente: {attachmentsPractice.clientName}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
                {(attachmentsByPracticeId.get(attachmentsPractice.id) ?? [])
                  .slice()
                  .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
                  .map((att) => (
                    <div
                      className="flex flex-col gap-1 rounded-xl border border-border bg-surface-container px-4 py-3"
                      key={att.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-label text-sm font-semibold text-foreground">
                            <FileText className="mr-1.5 inline h-4 w-4 align-text-bottom text-electric" />
                            {att.filename}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {format(new Date(att.created_at), "dd MMM yyyy - HH:mm", { locale: it })}
                            {" - "}
                            {formatFileSize(att.size_bytes)}
                            {att.mime_type ? ` - ${att.mime_type}` : ""}
                          </p>
                        </div>
                        <Badge variant="info">{att.source}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
