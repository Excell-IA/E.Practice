"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, Plus, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  attachAttachment,
  createClient,
  createPractice,
  deleteAttachment,
  getCategories,
  getTemplatePreview,
  getUsers,
  listAttachments,
  searchClients,
  uploadAttachment,
  type ApiAttachment,
  type ApiCategory,
  type ApiClientSearchHit,
  type ApiTemplatePreview,
  type ApiUser,
} from "@/lib/api";
import { directoryClients } from "@/lib/demo-directory";
import { DEMO_USERS, useDemoStore } from "@/lib/demo-state";
import { cn } from "@/lib/utils";

type PreviewPhase = ApiTemplatePreview["phases"][number] & { custom?: boolean; enabled: boolean; assignee_id?: string };
type LabelOption = { id: string; name: string; variant: BadgeProps["variant"] };
type ClientDraft = { email: string; name: string; phone: string; type: "societa" | "persona_fisica"; vat: string };

const fallbackCategories: ApiCategory[] = [
  { active: true, color: "#16a34a", group_name: "Pratiche", icon: "briefcase", id: "22222222-2222-4222-8222-000000000001", name: "Apertura posizione" },
  { active: true, color: "#ca8a04", group_name: "Fiscale", icon: "file-text", id: "22222222-2222-4222-8222-000000000002", name: "Dichiarazione fiscale" },
  { active: true, color: "#2563eb", group_name: "Bilanci", icon: "folder-kanban", id: "22222222-2222-4222-8222-000000000003", name: "Bilancio" },
  { active: true, color: "#16a34a", group_name: "Advisory", icon: "sparkles", id: "22222222-2222-4222-8222-000000000004", name: "Consulenza" },
  { active: true, color: "#dc2626", group_name: "Legale", icon: "scale", id: "22222222-2222-4222-8222-000000000005", name: "Contenzioso" },
];

const fallbackLabels: LabelOption[] = [
  { id: "44444444-4444-4444-8444-000000000001", name: "Urgente", variant: "danger" },
  { id: "44444444-4444-4444-8444-000000000002", name: "In attesa cliente", variant: "warning" },
  { id: "44444444-4444-4444-8444-000000000003", name: "Bandi", variant: "success" },
  { id: "44444444-4444-4444-8444-000000000005", name: "Bilancio", variant: "info" },
];

const fallbackClients: ApiClientSearchHit[] = directoryClients
  .map((client) => ({
    cf: client.taxCode,
    cliente_dal_anno: 2026,
    code: client.code,
    id: client.id,
    indirizzo_sede: client.address,
    piva: client.vat === "-" ? null : client.vat,
    practice_count: 1,
    practice_count_open: 1,
    ragione_sociale: client.name,
    type: client.type,
  }))
  .sort((a, b) => a.ragione_sociale.localeCompare(b.ragione_sociale, "it"));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fallbackPreview(category: ApiCategory, apertura: string): ApiTemplatePreview {
  const names =
    category.name === "Bilancio"
      ? ["Raccolta scritture", "Riconciliazione conti", "Scritture assestamento", "Redazione bozza", "Deposito"]
      : ["Raccolta documenti", "Verifica dati", "Predisposizione pratica", "Controllo finale"];
  let cursor = new Date(apertura);
  const phases = names.map((name, index) => {
    const start = cursor;
    const end = addDays(start, index === 0 ? 4 : 3);
    cursor = addDays(end, 1);
    return {
      description: null,
      duration_days: Math.max(1, differenceInCalendarDays(end, start)),
      name,
      order_index: index + 1,
      planned_end: format(end, "yyyy-MM-dd"),
      planned_start: format(start, "yyyy-MM-dd"),
    };
  });
  return {
    apertura,
    category_id: category.id,
    category_name: category.name,
    phases,
    scadenza_calcolata: phases.at(-1)?.planned_end ?? apertura,
    total_duration_days: phases.reduce((sum, phase) => sum + phase.duration_days, 0),
  };
}

function uploadedFileName(row: ApiAttachment) {
  return row.filename;
}

export function NewPracticeWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeUser = useDemoStore((state) => state.activeUser);
  const clientSectionRef = useRef<HTMLElement>(null);
  const titleSectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialClientId = searchParams.get("clientId");
  const [clientQuery, setClientQuery] = useState("");
  const [clientHits, setClientHits] = useState<ApiClientSearchHit[]>(fallbackClients);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId ?? fallbackClients[0]?.id ?? "");
  const [clientError, setClientError] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [clientSheetOpen, setClientSheetOpen] = useState(false);
  const [clientDraft, setClientDraft] = useState<ClientDraft>({ email: "", name: "", phone: "", type: "societa", vat: "" });
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientSheetError, setClientSheetError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>(fallbackCategories);
  const [users, setUsers] = useState<ApiUser[]>(
    DEMO_USERS.map((user) => ({
      avatar_color: user.avatarColor,
      cognome: user.name.split(" ").slice(1).join(" "),
      created_at: "2026-01-01T00:00:00Z",
      email: `${user.initials.toLowerCase()}@studioleali.it`,
      id: user.id,
      last_access_at: null,
      nome: user.name.split(" ")[0],
      role: user.permission === "admin" ? "titolare" : user.permission === "viewer" ? "esterno" : "senior",
      status: "attivo",
    })),
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(fallbackCategories[2].id);
  const [apertura, setApertura] = useState(today());
  const [scadenza, setScadenza] = useState("");
  const [responsibleId, setResponsibleId] = useState(activeUser.id);
  const [priority, setPriority] = useState<"bassa" | "media" | "alta">("media");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([fallbackLabels[0].id]);
  const [preview, setPreview] = useState<ApiTemplatePreview>(() => fallbackPreview(fallbackCategories[2], today()));
  const [phases, setPhases] = useState<PreviewPhase[]>(preview.phases.map((phase) => ({ ...phase, enabled: true })));
  const [reminders, setReminders] = useState(true);
  const [attachments, setAttachments] = useState<ApiAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const selectedCategory = categories.find((category) => category.id === categoryId) ?? categories[0];
  const selectedClient = clientHits.find((client) => client.id === selectedClientId) ?? fallbackClients.find((client) => client.id === selectedClientId);
  const preloadedAttachmentIds = useMemo(
    () =>
      (searchParams.get("attachments") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [searchParams],
  );

  const attachmentQuery = useQuery({
    enabled: preloadedAttachmentIds.length > 0,
    queryFn: async () => {
      const all = await listAttachments();
      const ids = new Set(preloadedAttachmentIds);
      return all.filter((attachment) => ids.has(attachment.id));
    },
    queryKey: ["attachments", "preloaded", preloadedAttachmentIds.join(",")],
  });

  useEffect(() => {
    void getCategories().then(setCategories).catch(() => undefined);
    void getUsers().then(setUsers).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (attachmentQuery.data) setAttachments((current) => [...attachmentQuery.data, ...current]);
  }, [attachmentQuery.data]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void searchClients(clientQuery)
        .then((hits) => setClientHits((hits.length ? hits : fallbackClients).sort((a, b) => a.ragione_sociale.localeCompare(b.ragione_sociale, "it"))))
        .catch(() => setClientHits(fallbackClients));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [clientQuery]);

  useEffect(() => {
    if (!selectedCategory) return;
    void getTemplatePreview(categoryId, apertura)
      .then((data) => {
        setPreview(data);
        setPhases(data.phases.map((phase) => ({ ...phase, enabled: true })));
        setScadenza(data.scadenza_calcolata);
      })
      .catch(() => {
        const data = fallbackPreview(selectedCategory, apertura);
        setPreview(data);
        setPhases(data.phases.map((phase) => ({ ...phase, enabled: true })));
        setScadenza(data.scadenza_calcolata);
      });
    // intentionally NOT depending on `scadenza`: changing the deadline
    // should not refetch the template and overwrite the redistributed phases.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apertura, categoryId, selectedCategory]);

  async function createClientFromSheet() {
    if (!clientDraft.name.trim()) return;
    setCreatingClient(true);
    setClientSheetError(null);
    const raw = clientDraft.vat.trim().toUpperCase().replace(/\s/g, "");
    const isPiva = /^\d{11}$/.test(raw);
    const isCf = /^[A-Z0-9]{16}$/.test(raw) || /^\d{11}$/.test(raw);
    const piva = isPiva ? raw : null;
    const cf = !isPiva && isCf && raw ? raw : null;
    try {
      const created = await createClient(
        {
          code: "",
          cf,
          email: clientDraft.email.trim() || null,
          indirizzo_sede: null,
          piva,
          ragione_sociale: clientDraft.name.trim(),
          status: "attivo",
          telefono: clientDraft.phone.trim() || null,
          type: clientDraft.type,
        },
        activeUser.id,
      );
      const hit: ApiClientSearchHit = {
        cf: created.cf,
        cliente_dal_anno: 2026,
        code: created.code,
        id: created.id,
        indirizzo_sede: created.indirizzo_sede,
        piva: created.piva,
        practice_count: 0,
        practice_count_open: 0,
        ragione_sociale: created.ragione_sociale,
        type: created.type,
      };
      setClientHits((current) => [hit, ...current.filter((client) => client.id !== hit.id)]);
      setSelectedClientId(hit.id);
      setClientError(false);
      setClientSheetOpen(false);
      setClientDraft({ email: "", name: "", phone: "", type: "societa", vat: "" });
    } catch (err) {
      console.error("create_client_failed", err);
      setClientSheetError(err instanceof Error ? err.message : "Creazione cliente non riuscita.");
    } finally {
      setCreatingClient(false);
    }
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadAttachment(file, activeUser.id)));
      setAttachments((current) => [...uploaded, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload allegato non riuscito.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAttachment(id: string) {
    setAttachments((current) => current.filter((row) => row.id !== id));
    await deleteAttachment(id, activeUser.id).catch(console.warn);
  }

  function distributePhasesBetween(list: PreviewPhase[], startIso: string, endIso: string): PreviewPhase[] {
    if (!list.length || !startIso || !endIso) return list;
    const start = new Date(startIso);
    const end = new Date(endIso);
    const totalDays = differenceInCalendarDays(end, start);
    if (totalDays <= 0) return list;
    const weights = list.map((phase) => Math.max(1, phase.duration_days || 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let cursor = start;
    return list.map((phase, index) => {
      const isLast = index === list.length - 1;
      const allocated = isLast
        ? Math.max(1, differenceInCalendarDays(end, cursor))
        : Math.max(1, Math.round((weights[index] / totalWeight) * totalDays));
      const phaseEnd = addDays(cursor, allocated);
      const next = {
        ...phase,
        planned_start: format(cursor, "yyyy-MM-dd"),
        planned_end: format(phaseEnd, "yyyy-MM-dd"),
        duration_days: allocated,
      };
      cursor = phaseEnd;
      return next;
    });
  }

  function handleScadenzaChange(value: string) {
    setScadenza(value);
    if (value) {
      setPhases((current) => distributePhasesBetween(current, apertura, value));
    }
  }

  function recomputeEndsAndOrder(list: PreviewPhase[], finalDate: string): PreviewPhase[] {
    const sorted = [...list].sort(
      (a, b) => new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime(),
    );
    return sorted.map((phase, index) => {
      const isLast = index === sorted.length - 1;
      const nextStart = isLast ? finalDate || phase.planned_end : sorted[index + 1].planned_start;
      const endIso = nextStart || phase.planned_end;
      const duration = Math.max(
        1,
        differenceInCalendarDays(new Date(endIso), new Date(phase.planned_start)),
      );
      return { ...phase, order_index: index + 1, planned_end: endIso, duration_days: duration };
    });
  }

  function updatePhaseStart(index: number, value: string) {
    setPhases((current) => {
      const updated = current.map((phase, itemIndex) =>
        itemIndex === index ? { ...phase, planned_start: value } : phase,
      );
      return recomputeEndsAndOrder(updated, scadenza);
    });
  }

  function updatePhaseAssignee(index: number, userId: string) {
    setPhases((current) =>
      current.map((phase, itemIndex) =>
        itemIndex === index ? { ...phase, assignee_id: userId } : phase,
      ),
    );
  }

  function updatePhaseName(index: number, value: string) {
    setPhases((current) =>
      current.map((phase, itemIndex) =>
        itemIndex === index ? { ...phase, name: value } : phase,
      ),
    );
  }

  function addCustomPhase() {
    const lastEnd = phases.length ? phases[phases.length - 1].planned_end : apertura;
    const start = addDays(new Date(lastEnd), 1);
    setPhases((current) =>
      recomputeEndsAndOrder(
        [
          ...current,
          {
            assignee_id: responsibleId,
            custom: true,
            description: null,
            duration_days: 15,
            enabled: true,
            name: "Nuova fase",
            order_index: current.length + 1,
            planned_end: format(addDays(start, 15), "yyyy-MM-dd"),
            planned_start: format(start, "yyyy-MM-dd"),
          },
        ],
        scadenza,
      ),
    );
  }

  function validate() {
    const missingClient = !selectedClientId;
    const missingTitle = !title.trim();
    setClientError(missingClient);
    setTitleError(missingTitle);
    if (missingClient) clientSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    else if (missingTitle) titleSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !missingClient && !missingTitle;
  }

  function goNext() {
    if (!validate()) return;
    setStep(2);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function goBack() {
    setStep(1);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const activePhases = phases.filter((phase) => phase.enabled);
      const result = await createPractice(
        {
          apertura,
          category_id: categoryId,
          client_id: selectedClientId,
          collaborator_ids: [],
          create_default_reminders: reminders,
          description,
          label_ids: selectedLabels,
          phase_overrides: activePhases.map((phase) => ({
            assignee_id: phase.assignee_id ?? responsibleId,
            enabled: phase.enabled,
            name: phase.name,
            order_index: phase.order_index,
            planned_end: phase.planned_end,
            planned_start: phase.planned_start,
          })),
          priority,
          responsible_id: responsibleId,
          scadenza: scadenza || preview.scadenza_calcolata,
          title: title.trim(),
        },
        activeUser.id,
      );
      await Promise.allSettled(attachments.map((attachment) => attachAttachment(attachment.id, result.practice_id, null, activeUser.id)));
      await queryClient.invalidateQueries({ queryKey: ["practices"] });
      await queryClient.invalidateQueries({ queryKey: ["practice-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["attachments"] });
      router.push(`/pratiche/${result.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la creazione della pratica.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-surface px-6 pb-28 pt-6 md:px-10">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Nuova pratica</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Crea pratica</h1>
          </div>
          <HelpButton title="Creare una nuova pratica" subtitle="2 step: cliente + dati, poi fasi + allegati">
            <section>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Step 1 — Cliente e dati</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Cerca</strong> il cliente in rubrica per nome o P.IVA, oppure premi <strong className="text-foreground">+ Nuovo cliente</strong> per crearlo al volo.</li>
                <li><strong className="text-foreground">Tipologia pratica</strong>: scegli la categoria. Le fasi del template arrivano in automatico nello step 2.</li>
                <li><strong className="text-foreground">Apertura</strong>: data di inizio (default oggi). <strong className="text-foreground">Scadenza richiesta</strong>: quando vuoi chiudere — le fasi si ridistribuiscono per finire entro quella data.</li>
                <li><strong className="text-foreground">Responsabile</strong>: utente che vedrà la pratica in agenda. <strong className="text-foreground">Priorità + etichette</strong>: tag liberi.</li>
              </ul>
            </section>
            <section>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Step 2 — Fasi e allegati</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Le fasi del template sono modificabili: cambia <strong className="text-foreground">nome</strong>, <strong className="text-foreground">data inizio</strong>, <strong className="text-foreground">assegnatario</strong>; rimuovile con il cestino.</li>
                <li>Cambiando una data le fasi si riordinano automaticamente per data; il numero di fase si riassegna al volo.</li>
                <li><strong className="text-foreground">+ Aggiungi fase</strong>: aggiunge una fase personalizzata in coda.</li>
                <li><strong className="text-foreground">Documenti allegati</strong>: trascina file o clicca Seleziona file. Vengono collegati alla pratica al momento della creazione.</li>
              </ul>
            </section>
            <section>
              <p>Puoi tornare allo Step 1 in qualsiasi momento con <strong className="text-foreground">Indietro</strong>. Il pulsante <strong className="text-foreground">Crea pratica</strong> è attivo solo se cliente e titolo sono compilati.</p>
            </section>
          </HelpButton>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-low px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-bold", step === 1 ? "bg-electric text-[var(--on-primary)]" : "bg-success/80 text-[var(--on-primary)]")}>
              {step === 1 ? "1" : <Check className="h-3.5 w-3.5" />}
            </span>
            <span className={cn("font-semibold", step === 1 ? "text-foreground" : "text-muted")}>Cliente e dati pratica</span>
          </div>
          <span className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-bold", step === 2 ? "bg-electric text-[var(--on-primary)]" : "bg-surface-high text-muted")}>2</span>
            <span className={cn("font-semibold", step === 2 ? "text-foreground" : "text-muted")}>Fasi e allegati</span>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}

        {step === 1 ? (
        <Card className={cn(clientError && "border-danger")} ref={clientSectionRef as React.RefObject<HTMLDivElement>}>
          <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 md:grid-cols-[260px_1fr_auto]">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted">Cerca in rubrica</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-surface-container pl-9 pr-3 text-sm outline-none"
                    onChange={(event) => setClientQuery(event.target.value)}
                    placeholder="Nome cliente, P.IVA o CF"
                    value={clientQuery}
                  />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted">
                  Cliente {clientQuery.trim() ? `(${clientHits.length} ${clientHits.length === 1 ? "risultato" : "risultati"})` : `(${clientHits.length} in rubrica)`}
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 text-sm outline-none"
                  onChange={(event) => {
                    setSelectedClientId(event.target.value);
                    setClientError(false);
                  }}
                  value={selectedClientId}
                >
                  {clientHits.length === 0 ? (
                    <option value="">Nessun cliente — usa &quot;+ Nuovo cliente&quot;</option>
                  ) : null}
                  {clientHits.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.ragione_sociale}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <Button onClick={() => setClientSheetOpen(true)} type="button" variant="outline">
                  <Plus className="h-4 w-4" />
                  Nuovo cliente
                </Button>
              </div>
            </div>
            <span className="block text-xs text-muted">
              {selectedClient ? `${selectedClient.code} - ${selectedClient.piva ?? selectedClient.cf ?? "senza P.IVA"}` : "Seleziona un cliente"}
            </span>
          </CardContent>
        </Card>
        ) : null}

        {step === 1 ? (
        <Card className={cn(titleError && "border-danger")} ref={titleSectionRef as React.RefObject<HTMLDivElement>}>
          <CardHeader><CardTitle>Dati pratica</CardTitle></CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_420px]">
            <section className="grid gap-3">
              <input className="h-11 rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => { setTitle(event.target.value); setTitleError(false); }} placeholder="Titolo pratica" value={title} />
              <textarea className="min-h-24 rounded-xl border border-border bg-surface-container p-3 outline-none" onChange={(event) => setDescription(event.target.value)} placeholder="Descrizione" value={description} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-xs font-semibold text-muted">Tipologia pratica</span>
                  <select className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold text-muted">Responsabile pratica</span>
                  <select className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setResponsibleId(event.target.value)} value={responsibleId}>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.nome} {user.cognome}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold text-muted">Apertura pratica</span>
                  <input className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setApertura(event.target.value)} title="Data di apertura della pratica" type="date" value={apertura} />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold text-muted">Scadenza richiesta</span>
                  <input className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => handleScadenzaChange(event.target.value)} title="Cambiando la scadenza, le fasi si ridistribuiscono automaticamente tra apertura e scadenza" type="date" value={scadenza} />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="block text-xs font-semibold text-muted">Priorità</span>
                  <select className="h-10 w-full rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setPriority(event.target.value as typeof priority)} value={priority}>
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {fallbackLabels.map((label) => (
                  <button key={label.id} onClick={() => setSelectedLabels((current) => current.includes(label.id) ? current.filter((id) => id !== label.id) : [...current, label.id])} type="button">
                    <Badge variant={selectedLabels.includes(label.id) ? label.variant : "default"}>{label.name}</Badge>
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-surface-container p-4">
              <p className="font-semibold text-foreground">{preview.category_name}</p>
              <p className="mt-1 text-sm text-muted">
                {phases.length} fasi
                {phases.length ? ` · ultima il ${format(new Date(phases[phases.length - 1].planned_end), "dd MMM yyyy", { locale: it })}` : ""}
                {scadenza && phases.length ? (phases[phases.length - 1].planned_end !== scadenza ? ` (scadenza richiesta ${format(new Date(scadenza), "dd MMM yyyy", { locale: it })})` : "") : ""}
              </p>
              <div className="mt-4 space-y-2">
                {phases.map((phase, index) => (
                  <div className="flex items-center justify-between rounded-xl bg-surface-low p-2 text-sm" key={`preview-${phase.order_index}-${index}`}>
                    <span className="truncate">{phase.order_index}. {phase.name}</span>
                    <span className="ml-2 shrink-0 text-muted">{format(new Date(phase.planned_end), "dd/MM")}</span>
                  </div>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
        ) : null}

        {step === 2 ? (
        <Card>
          <CardHeader><CardTitle>Fasi</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground"><input checked={reminders} onChange={(event) => setReminders(event.target.checked)} type="checkbox" /> Crea reminders automatici</label>
              <Button onClick={addCustomPhase} type="button" variant="outline"><Plus className="h-4 w-4" />Aggiungi fase</Button>
            </div>
            <div className="hidden gap-3 px-3 pb-2 text-[10px] font-display font-semibold uppercase tracking-[0.14em] text-muted md:grid md:grid-cols-[40px_1fr_170px_220px_40px]">
              <span>#</span>
              <span>Nome fase</span>
              <span>Data inizio</span>
              <span>Assegnatario</span>
              <span />
            </div>
            <div className="space-y-2">
              {phases.map((phase, index) => (
                <div className="grid gap-3 rounded-xl border border-border bg-surface-container p-3 text-sm md:grid-cols-[40px_1fr_170px_220px_40px] md:items-center" key={`phase-${phase.order_index}-${index}`}>
                  <span className="font-label text-muted">#{index + 1}</span>
                  <input className="rounded-lg bg-surface-low px-2 py-1.5 outline-none" onChange={(event) => updatePhaseName(index, event.target.value)} placeholder="Nome fase" value={phase.name} />
                  <input className="rounded-lg bg-surface-low px-2 py-1.5 outline-none" onChange={(event) => updatePhaseStart(index, event.target.value)} type="date" value={phase.planned_start} />
                  <select className="rounded-lg bg-surface-low px-2 py-1.5 text-xs outline-none" onChange={(event) => updatePhaseAssignee(index, event.target.value)} value={phase.assignee_id ?? responsibleId}>
                    {users.map((user) => (
                      <option className="bg-surface text-foreground" key={user.id} value={user.id}>
                        {user.nome} {user.cognome}
                      </option>
                    ))}
                  </select>
                  <button aria-label="Rimuovi fase" onClick={() => setPhases((current) => current.filter((_, itemIndex) => itemIndex !== index))} title="Rimuovi fase" type="button">
                    <Trash2 className="h-4 w-4 text-muted hover:text-danger" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        ) : null}

        {step === 2 ? (
        <Card>
          <CardHeader><CardTitle>Documenti allegati</CardTitle></CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div
              className={cn("flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-container p-6 text-center", isDragging && "border-electric bg-electric/10")}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }}
            >
              <UploadCloud className="mb-3 h-8 w-8 text-electric" />
              <p className="font-semibold text-foreground">Trascina qui i file della pratica</p>
              <p className="mt-1 text-sm text-muted">Verranno allegati automaticamente dopo la creazione.</p>
              <input className="hidden" multiple onChange={(event) => addFiles(event.target.files)} ref={inputRef} type="file" />
              <Button className="mt-4" disabled={isUploading} onClick={() => inputRef.current?.click()} type="button" variant="outline">
                <FileSpreadsheet className="h-4 w-4" />
                {isUploading ? "Caricamento..." : "Seleziona file"}
              </Button>
            </div>
            <div className="space-y-2">
              {attachments.length ? attachments.map((attachment) => (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-container px-3 py-2" key={attachment.id}>
                  <p className="truncate text-sm font-semibold text-foreground">{uploadedFileName(attachment)}</p>
                  <button aria-label="Rimuovi allegato" className="text-muted hover:text-danger" onClick={() => removeAttachment(attachment.id)} type="button">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )) : <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">Nessun documento allegato.</p>}
            </div>
          </CardContent>
        </Card>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface-low/95 px-6 py-3 backdrop-blur lg:left-60">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {step === 1 ? "Step 1 di 2 — completa cliente e dati prima di proseguire" : "Step 2 di 2 — rivedi fasi e aggiungi eventuali allegati"}
          </p>
          <div className="flex items-center gap-2">
            {step === 2 ? (
              <Button onClick={goBack} type="button" variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </Button>
            ) : null}
            {step === 1 ? (
              <Button onClick={goNext} type="button">
                Avanti
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={submitting} onClick={submit} type="button">
                <Check className="h-4 w-4" />
                {submitting ? "Creazione..." : "Crea pratica"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Sheet onOpenChange={setClientSheetOpen} open={clientSheetOpen}>
        <SheetContent className="max-w-lg">
          <SheetHeader>
            <SheetTitle>Nuovo cliente</SheetTitle>
            <SheetDescription>Compila solo i dati essenziali per aprire subito la pratica.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {clientSheetError ? (
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{clientSheetError}</p>
            ) : null}
            <input className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setClientDraft((value) => ({ ...value, name: event.target.value }))} placeholder="Ragione sociale" value={clientDraft.name} />
            <select className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setClientDraft((value) => ({ ...value, type: event.target.value as ClientDraft["type"] }))} value={clientDraft.type}>
              <option value="societa">Societa</option>
              <option value="persona_fisica">Persona fisica</option>
            </select>
            <input className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setClientDraft((value) => ({ ...value, vat: event.target.value }))} placeholder="P.IVA / CF" value={clientDraft.vat} />
            <input className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setClientDraft((value) => ({ ...value, email: event.target.value }))} placeholder="Email" value={clientDraft.email} />
            <input className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setClientDraft((value) => ({ ...value, phone: event.target.value }))} placeholder="Telefono" value={clientDraft.phone} />
            <Button className="w-full" disabled={!clientDraft.name.trim() || creatingClient} onClick={createClientFromSheet} type="button">
              {creatingClient ? "Creazione..." : "Crea e seleziona cliente"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
