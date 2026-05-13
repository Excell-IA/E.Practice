"use client";

import { addDays, differenceInCalendarDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Check, Plus, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  attachAttachment,
  createClient,
  createPractice,
  getCategories,
  getTemplatePreview,
  getUsers,
  listAttachments,
  searchClients,
  type ApiCategory,
  type ApiClientSearchHit,
  type ApiTemplatePreview,
  type ApiUser,
} from "@/lib/api";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_USERS, useDemoStore } from "@/lib/demo-state";
import { directoryClients } from "@/lib/demo-directory";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3;
type PreviewPhase = ApiTemplatePreview["phases"][number] & { enabled: boolean; custom?: boolean };
type LabelOption = { id: string; name: string; variant: BadgeProps["variant"] };

const fallbackCategories: ApiCategory[] = [
  { id: "22222222-2222-4222-8222-000000000001", name: "Apertura posizione", group_name: "Pratiche", icon: "briefcase", color: "#16a34a", active: true },
  { id: "22222222-2222-4222-8222-000000000002", name: "Dichiarazione fiscale", group_name: "Fiscale", icon: "file-text", color: "#ca8a04", active: true },
  { id: "22222222-2222-4222-8222-000000000003", name: "Bilancio", group_name: "Bilanci", icon: "folder-kanban", color: "#2563eb", active: true },
  { id: "22222222-2222-4222-8222-000000000004", name: "Consulenza", group_name: "Advisory", icon: "sparkles", color: "#16a34a", active: true },
  { id: "22222222-2222-4222-8222-000000000005", name: "Contenzioso", group_name: "Legale", icon: "scale", color: "#dc2626", active: true },
];

const fallbackLabels: LabelOption[] = [
  { id: "44444444-4444-4444-8444-000000000001", name: "Urgente", variant: "danger" },
  { id: "44444444-4444-4444-8444-000000000002", name: "In attesa cliente", variant: "warning" },
  { id: "44444444-4444-4444-8444-000000000003", name: "Bandi", variant: "success" },
  { id: "44444444-4444-4444-8444-000000000005", name: "Bilancio", variant: "info" },
];

const fallbackClients: ApiClientSearchHit[] = directoryClients.slice(0, 6).map((client) => ({
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
}));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fallbackPreview(category: ApiCategory, apertura: string): ApiTemplatePreview {
  const names = category.name === "Bilancio"
    ? ["Raccolta scritture", "Riconciliazione conti", "Scritture assestamento", "Redazione bozza", "Deposito"]
    : ["Raccolta documenti", "Verifica dati", "Predisposizione pratica", "Controllo finale"];
  let cursor = new Date(apertura);
  const phases = names.map((name, index) => {
    const start = cursor;
    const end = addDays(start, index === 0 ? 4 : 3);
    cursor = end;
    return {
      description: null,
      duration_days: index === 0 ? 4 : 3,
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
    scadenza_calcolata: format(cursor, "yyyy-MM-dd"),
    total_duration_days: phases.reduce((sum, phase) => sum + phase.duration_days, 0),
  };
}

export function NewPracticeWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeUser = useDemoStore((state) => state.activeUser);
  const [step, setStep] = useState<WizardStep>(1);
  const [clientQuery, setClientQuery] = useState("");
  const [clientHits, setClientHits] = useState<ApiClientSearchHit[]>(fallbackClients);
  const [selectedClient, setSelectedClient] = useState<ApiClientSearchHit | null>(fallbackClients[0]);
  const [createNewClient, setCreateNewClient] = useState(false);
  const [newClient, setNewClient] = useState<{ city: string; email: string; name: string; phone: string; type: "societa" | "persona_fisica"; vat: string }>({ city: "Brescia", email: "", name: "", phone: "", type: "societa", vat: "" });
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
  const [responsibleId, setResponsibleId] = useState<string>(activeUser.id);
  const [priority, setPriority] = useState<"bassa" | "media" | "alta">("media");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([fallbackLabels[0].id]);
  const [preview, setPreview] = useState<ApiTemplatePreview>(() => fallbackPreview(fallbackCategories[2], today()));
  const [phases, setPhases] = useState<PreviewPhase[]>(preview.phases.map((phase) => ({ ...phase, enabled: true })));
  const [reminders, setReminders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((category) => category.id === categoryId) ?? categories[0];
  const attachmentIds = useMemo(
    () =>
      (searchParams.get("attachments") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [searchParams],
  );
  const attachmentQuery = useQuery({
    enabled: attachmentIds.length > 0,
    queryFn: async () => {
      const attachments = await listAttachments();
      const ids = new Set(attachmentIds);
      return attachments.filter((attachment) => ids.has(attachment.id));
    },
    queryKey: ["attachments", "preloaded", attachmentIds.join(",")],
  });
  const canContinueStep1 = createNewClient ? Boolean(newClient.name.trim()) : Boolean(selectedClient);
  const canSubmit = Boolean(title.trim() && categoryId && responsibleId && canContinueStep1);

  useEffect(() => {
    void getCategories().then(setCategories).catch(() => undefined);
    void getUsers().then(setUsers).catch(() => undefined);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void searchClients(clientQuery).then((hits) => setClientHits(hits.length ? hits : fallbackClients)).catch(() => setClientHits(fallbackClients));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [clientQuery]);

  useEffect(() => {
    if (!selectedCategory) return;
    void getTemplatePreview(categoryId, apertura)
      .then((data) => {
        setPreview(data);
        setPhases(data.phases.map((phase) => ({ ...phase, enabled: true })));
        if (!scadenza) setScadenza(data.scadenza_calcolata);
      })
      .catch(() => {
        const data = fallbackPreview(selectedCategory, apertura);
        setPreview(data);
        setPhases(data.phases.map((phase) => ({ ...phase, enabled: true })));
        if (!scadenza) setScadenza(data.scadenza_calcolata);
      });
  }, [apertura, categoryId, scadenza, selectedCategory]);

  const activePhases = useMemo(() => phases.filter((phase) => phase.enabled), [phases]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let clientId = selectedClient?.id ?? "";
      if (createNewClient) {
        const created = await createClient(
          {
            code: "",
            cf: newClient.vat || null,
            email: newClient.email || null,
            indirizzo_sede: newClient.city || null,
            piva: newClient.vat || null,
            ragione_sociale: newClient.name,
            status: "attivo",
            telefono: newClient.phone || null,
            type: newClient.type,
          },
          activeUser.id,
        );
        clientId = created.id;
      }
      const payload = {
        apertura,
        category_id: categoryId,
        client_id: clientId,
        collaborator_ids: [],
        create_default_reminders: reminders,
        description,
        label_ids: selectedLabels,
        phase_overrides: activePhases.map((phase) => ({
          enabled: phase.enabled,
          name: phase.name,
          order_index: phase.order_index,
          planned_end: phase.planned_end,
          planned_start: phase.planned_start,
        })),
        priority,
        responsible_id: responsibleId,
        scadenza: scadenza || preview.scadenza_calcolata,
        title,
      };
      console.info("create_practice_payload", payload);
      const result = await createPractice(payload, activeUser.id);
      const attachFailures: string[] = [];
      for (const attachmentId of attachmentIds) {
        try {
          await attachAttachment(attachmentId, result.practice_id, null, activeUser.id);
        } catch (attachError) {
          console.warn("attachment_attach_failed", attachmentId, attachError);
          attachFailures.push(attachmentId);
        }
      }
      if (attachFailures.length > 0) {
        console.warn("attachments_not_attached", attachFailures);
      }
      await queryClient.invalidateQueries({ queryKey: ["practices"] });
      await queryClient.invalidateQueries({ queryKey: ["practice-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["attachments"] });
      router.push(`/pratiche/${result.code}`);
    } catch (err) {
      console.error("create_practice_failed", err);
      setError(err instanceof Error ? err.message : "Errore durante la creazione della pratica.");
    } finally {
      setSubmitting(false);
    }
  }

  function addCustomPhase() {
    const index = phases.length + 1;
    const lastEnd = phases.length ? phases[phases.length - 1].planned_end : apertura;
    const start = addDays(new Date(lastEnd), 1);
    setPhases((current) => [
      ...current,
      {
        custom: true,
        description: null,
        duration_days: 2,
        enabled: true,
        name: "Fase custom",
        order_index: index,
        planned_end: format(addDays(start, 2), "yyyy-MM-dd"),
        planned_start: format(start, "yyyy-MM-dd"),
      },
    ]);
  }

  function updatePhaseDate(index: number, field: "planned_start" | "planned_end", value: string) {
    setPhases((current) =>
      current.map((phase, itemIndex) => {
        if (itemIndex !== index) return phase;
        const next = { ...phase, [field]: value };
        let start = new Date(next.planned_start);
        let end = new Date(next.planned_end);
        if (end < start) {
          const swap = start;
          start = end;
          end = swap;
          next.planned_start = format(start, "yyyy-MM-dd");
          next.planned_end = format(end, "yyyy-MM-dd");
        }
        next.duration_days = Math.max(1, differenceInCalendarDays(end, start));
        return next;
      }),
    );
  }

  return (
    <main className="min-h-[calc(100vh-60px)] bg-surface px-6 py-6 md:px-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Nuova pratica</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Wizard pratica guidata</h1>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((item) => (
              <button
                className={cn("h-9 rounded-full border border-border px-4 text-sm font-semibold text-muted", step === item && "border-electric/40 bg-electric/10 text-electric")}
                key={item}
                onClick={() => setStep(item as WizardStep)}
                type="button"
              >
                Step {item}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        ) : null}

        {attachmentIds.length > 0 ? (
          <Card className="border-electric/30 bg-electric/5">
            <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
                  Allegati pre-caricati
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {attachmentIds.length === 1 ? "1 file pronto da allegare" : `${attachmentIds.length} file pronti da allegare`}
                </p>
                {attachmentQuery.data?.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {attachmentQuery.data.map((attachment) => (
                      <li key={attachment.id}>{attachment.filename}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">
                    {attachmentQuery.isLoading ? "Recupero nomi file..." : "File caricati, pronti per il collegamento."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card>
            <CardHeader><CardTitle>1. Cliente</CardTitle></CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-2">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-foreground">Cerca in rubrica</p>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input checked={createNewClient} onChange={(event) => setCreateNewClient(event.target.checked)} type="checkbox" />
                    Crea cliente nuovo
                  </label>
                </div>
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input className="h-10 w-full rounded-xl border border-border bg-surface-container pl-9 pr-3 text-sm outline-none" disabled={createNewClient} onChange={(event) => setClientQuery(event.target.value)} placeholder="Ragione sociale o P.IVA" value={clientQuery} />
                </label>
                <div className="mt-3 space-y-2">
                  {clientHits.map((client) => (
                    <button className={cn("w-full rounded-xl border border-border bg-surface-container p-3 text-left hover:bg-surface-high", selectedClient?.id === client.id && "border-electric/50")} disabled={createNewClient} key={client.id} onClick={() => setSelectedClient(client)} type="button">
                      <p className="font-semibold text-foreground">{client.ragione_sociale}</p>
                      <p className="text-xs text-muted">{client.code} · {client.piva ?? client.cf ?? "-"} · {client.practice_count_open} pratiche aperte</p>
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-surface-container p-4">
                <p className="mb-3 font-semibold text-foreground">Crea cliente nuovo</p>
                <div className="grid gap-3">
                  <input className="h-10 rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setNewClient((value) => ({ ...value, name: event.target.value }))} placeholder="Ragione sociale" value={newClient.name} />
                  <select className="h-10 rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setNewClient((value) => ({ ...value, type: event.target.value as "societa" | "persona_fisica" }))} value={newClient.type}>
                    <option value="societa">Societa</option>
                    <option value="persona_fisica">Persona fisica</option>
                  </select>
                  <input className="h-10 rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setNewClient((value) => ({ ...value, vat: event.target.value }))} placeholder="P.IVA / CF" value={newClient.vat} />
                  <input className="h-10 rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setNewClient((value) => ({ ...value, email: event.target.value }))} placeholder="Email" value={newClient.email} />
                  <input className="h-10 rounded-xl border border-border bg-surface-low px-3 text-sm outline-none" onChange={(event) => setNewClient((value) => ({ ...value, phone: event.target.value }))} placeholder="Telefono" value={newClient.phone} />
                </div>
              </section>
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card>
            <CardHeader><CardTitle>2. Dati pratica</CardTitle></CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1fr_420px]">
              <section className="grid gap-3">
                <input className="h-11 rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setTitle(event.target.value)} placeholder="Titolo pratica" value={title} />
                <textarea className="min-h-24 rounded-xl border border-border bg-surface-container p-3 outline-none" onChange={(event) => setDescription(event.target.value)} placeholder="Descrizione" value={description} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="h-10 rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <select className="h-10 rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setResponsibleId(event.target.value)} value={responsibleId}>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.nome} {user.cognome}</option>)}
                  </select>
                  <input className="h-10 rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setApertura(event.target.value)} type="date" value={apertura} />
                  <input className="h-10 rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setScadenza(event.target.value)} type="date" value={scadenza} />
                  <select className="h-10 rounded-xl border border-border bg-surface-container px-3 outline-none" onChange={(event) => setPriority(event.target.value as typeof priority)} value={priority}>
                    <option value="bassa">Priorita bassa</option>
                    <option value="media">Priorita media</option>
                    <option value="alta">Priorita alta</option>
                  </select>
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
                <p className="mt-1 text-sm text-muted">Durata {preview.total_duration_days} giorni · scadenza {format(new Date(preview.scadenza_calcolata), "dd MMM yyyy", { locale: it })}</p>
                <div className="mt-4 space-y-2">
                  {preview.phases.slice(0, 5).map((phase) => (
                    <div className="flex items-center justify-between rounded-xl bg-surface-low p-2 text-sm" key={phase.order_index}>
                      <span>{phase.order_index}. {phase.name}</span>
                      <span className="text-muted">{format(new Date(phase.planned_end), "dd/MM")}</span>
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <CardHeader><CardTitle>3. Review fasi</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground"><input checked={reminders} onChange={(event) => setReminders(event.target.checked)} type="checkbox" /> Crea reminders automatici</label>
                <Button onClick={addCustomPhase} type="button" variant="outline"><Plus className="h-4 w-4" />Aggiungi fase</Button>
              </div>
              <div className="space-y-2">
                {phases.map((phase, index) => (
                  <div className={cn("grid gap-3 rounded-xl border border-border bg-surface-container p-3 text-sm md:grid-cols-[40px_1fr_140px_140px_80px_40px]", !phase.enabled && "opacity-45")} key={`${phase.name}-${index}`}>
                    <span className="font-label text-muted">#{index + 1}</span>
                    <input className="rounded-lg bg-surface-low px-2 py-1 outline-none" onChange={(event) => setPhases((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} value={phase.name} />
                    <input className="rounded-lg bg-surface-low px-2 py-1 outline-none" onChange={(event) => updatePhaseDate(index, "planned_start", event.target.value)} type="date" value={phase.planned_start} />
                    <input className="rounded-lg bg-surface-low px-2 py-1 outline-none" onChange={(event) => updatePhaseDate(index, "planned_end", event.target.value)} type="date" value={phase.planned_end} />
                    <span>{phase.duration_days} giorni</span>
                    <button aria-label="Rimuovi fase" onClick={() => setPhases((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item))} type="button"><Trash2 className="h-4 w-4 text-muted" /></button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">{activePhases.length} fasi verranno create dal template selezionato.</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex justify-between">
          <Button disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1) as WizardStep)} type="button" variant="outline"><ArrowLeft className="h-4 w-4" />Indietro</Button>
          {step < 3 ? (
            <Button disabled={step === 1 && !canContinueStep1} onClick={() => setStep((current) => Math.min(3, current + 1) as WizardStep)} type="button">Avanti<ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button disabled={!canSubmit || submitting} onClick={submit} type="button"><Check className="h-4 w-4" />Crea pratica</Button>
          )}
        </div>
      </div>
    </main>
  );
}
