"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Link as LinkIcon, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/ui/help-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { V1Hint } from "@/components/ui/v1-hint";
import { createClient, deleteClient, getPractices, updateClient } from "@/lib/api";
import { directoryClients, directoryPractices, type DirectoryClient, type DirectoryPractice } from "@/lib/demo-directory";
import { useDemoStore } from "@/lib/demo-state";
import { mapApiPracticeToDirectoryPractice } from "@/lib/mappers/practice-list";

type SortKey = "code" | "name" | "city" | "openCount";
type SortDirection = "asc" | "desc";

type NewClientDraft = {
  email: string;
  name: string;
  phone: string;
  type: "societa" | "persona_fisica";
  vat: string;
};

type ClientEditDraft = {
  address: string;
  email: string;
  labels: string[];
  name: string;
  phone: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getInitialClientLabels() {
  return Array.from(new Set(directoryClients.flatMap((client) => client.labels))).sort((a, b) =>
    a.localeCompare(b, "it"),
  );
}

export function ClientsListClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DirectoryClient | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<ClientEditDraft | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelCatalog, setLabelCatalog] = useState<string[]>(getInitialClientLabels);
  const [clientOverrides, setClientOverrides] = useState<Record<string, DirectoryClient>>({});
  const [deletedClientIds, setDeletedClientIds] = useState<Set<string>>(() => new Set());
  const [savingClient, setSavingClient] = useState(false);
  const [clientSaveMessage, setClientSaveMessage] = useState<string | null>(null);
  const [clientEditError, setClientEditError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClient, setNewClient] = useState<NewClientDraft>({
    email: "",
    name: "",
    phone: "",
    type: "societa",
    vat: "",
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const activeUser = useDemoStore((state) => state.activeUser);
  const practicesQuery = useQuery({
    queryFn: () => getPractices(),
    queryKey: ["practices"],
  });
  const allPractices: DirectoryPractice[] = useMemo(() => {
    const fromApi = practicesQuery.data?.items.map(mapApiPracticeToDirectoryPractice) ?? [];
    return fromApi.length ? fromApi : directoryPractices;
  }, [practicesQuery.data?.items]);
  const clients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const baseClients = directoryClients
      .filter((client) => !deletedClientIds.has(client.id))
      .map((client) => clientOverrides[client.id] ?? client);
    const filtered = needle ? baseClients.filter((client) =>
      `${client.name} ${client.vat} ${client.taxCode}`.toLowerCase().includes(needle),
    ) : baseClients;
    return [...filtered].sort((a, b) => {
      const openA = allPractices.filter((practice) => practice.clientId === a.id && practice.status !== "chiusa").length;
      const openB = allPractices.filter((practice) => practice.clientId === b.id && practice.status !== "chiusa").length;
      const left = sortKey === "openCount" ? openA : a[sortKey];
      const right = sortKey === "openCount" ? openB : b[sortKey];
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "it");
      return sortDirection === "asc" ? result : -result;
    });
  }, [allPractices, clientOverrides, deletedClientIds, query, sortDirection, sortKey]);
  const clientPractices = selected ? allPractices.filter((practice) => practice.clientId === selected.id) : [];
  const selectedView = selected && selectedDraft
    ? {
      ...selected,
      address: selectedDraft.address,
      email: selectedDraft.email,
      labels: selectedDraft.labels,
      name: selectedDraft.name,
      phone: selectedDraft.phone,
    }
    : selected;
  // V1: spostare catalogo, colori e governance etichette in una configurazione persistente.
  const labelOptions = labelCatalog;

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return null;
    const Icon = sortDirection === "asc" ? ArrowUp : ArrowDown;
    return <Icon className="h-3.5 w-3.5" />;
  }

  function openClient(client: DirectoryClient) {
    setSelected(client);
    setSelectedDraft({
      address: client.address,
      email: client.email,
      labels: client.labels,
      name: client.name,
      phone: client.phone,
    });
    setLabelDraft("");
    setClientEditError(null);
    setClientSaveMessage(null);
    setDeleteConfirmOpen(false);
  }

  function closeClient() {
    setSelected(null);
    setSelectedDraft(null);
    setLabelDraft("");
    setClientEditError(null);
    setClientSaveMessage(null);
    setDeleteConfirmOpen(false);
  }

  function addLabel() {
    const nextLabel = labelDraft.trim();
    if (!nextLabel || !selectedDraft) return;
    if (selectedDraft.labels.some((label) => label.toLowerCase() === nextLabel.toLowerCase())) {
      setLabelDraft("");
      return;
    }
    setLabelCatalog((current) => {
      if (current.some((label) => label.toLowerCase() === nextLabel.toLowerCase())) return current;
      return [...current, nextLabel].sort((a, b) => a.localeCompare(b, "it"));
    });
    setSelectedDraft((draft) => draft ? { ...draft, labels: [...draft.labels, nextLabel] } : draft);
    setLabelDraft("");
  }

  async function saveSelectedClient() {
    if (!selected || !selectedDraft) return;
    setSavingClient(true);
    setClientEditError(null);
    setClientSaveMessage(null);
    try {
      const updated = await updateClient(
        selected.id,
        {
          email: selectedDraft.email.trim() || null,
          indirizzo_sede: selectedDraft.address.trim() || null,
          ragione_sociale: selectedDraft.name.trim(),
          telefono: selectedDraft.phone.trim() || null,
        },
        activeUser.id,
      );
      const nextClient: DirectoryClient = {
        ...selected,
        address: updated.indirizzo_sede ?? selectedDraft.address,
        email: updated.email ?? "",
        labels: selectedDraft.labels,
        name: updated.ragione_sociale,
        phone: updated.telefono ?? "",
      };
      setClientOverrides((current) => ({ ...current, [nextClient.id]: nextClient }));
      setSelected(nextClient);
      setSelectedDraft({
        address: nextClient.address,
        email: nextClient.email,
        labels: nextClient.labels,
        name: nextClient.name,
        phone: nextClient.phone,
      });
      setClientSaveMessage("Modifiche salvate.");
    } catch (err) {
      console.error("update_client_failed", err);
      setClientEditError(err instanceof Error ? err.message : "Salvataggio cliente non riuscito.");
    } finally {
      setSavingClient(false);
    }
  }

  async function confirmDeleteClient() {
    if (!selected) return;
    setDeletingClient(true);
    setClientEditError(null);
    try {
      await deleteClient(selected.id, activeUser.id);
      setDeletedClientIds((current) => {
        const next = new Set(current);
        next.add(selected.id);
        return next;
      });
      closeClient();
    } catch (err) {
      console.error("delete_client_failed", err);
      setClientEditError(err instanceof Error ? err.message : "Eliminazione cliente non riuscita.");
      setDeleteConfirmOpen(false);
    } finally {
      setDeletingClient(false);
    }
  }

  async function submitNewClient() {
    if (!newClient.name.trim()) return;
    setCreatingClient(true);
    setNewClientError(null);
    const raw = newClient.vat.trim().toUpperCase().replace(/\s/g, "");
    const isPiva = /^\d{11}$/.test(raw);
    const isCf = /^[A-Z0-9]{16}$/.test(raw);
    const piva = isPiva ? raw : null;
    const cf = !isPiva && isCf ? raw : null;
    try {
      await createClient(
        {
          code: "",
          cf,
          email: newClient.email.trim() || null,
          indirizzo_sede: null,
          piva,
          ragione_sociale: newClient.name.trim(),
          status: "attivo",
          telefono: newClient.phone.trim() || null,
          type: newClient.type,
        },
        activeUser.id,
      );
      setNewClient({ email: "", name: "", phone: "", type: "societa", vat: "" });
      setNewClientOpen(false);
    } catch (err) {
      console.error("create_client_failed", err);
      setNewClientError(err instanceof Error ? err.message : "Creazione cliente non riuscita.");
    } finally {
      setCreatingClient(false);
    }
  }

  function SortButton({ children, sort }: { children: string; sort: SortKey }) {
    return (
      <button className="inline-flex items-center gap-1.5 hover:text-foreground" onClick={() => toggleSort(sort)} type="button">
        {children}
        {sortIcon(sort)}
      </button>
    );
  }

  return (
    <main className="min-h-[calc(100vh-60px)] bg-surface px-6 py-6 md:px-10">
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <HelpButton title="Rubrica clienti" subtitle="Anagrafica + pratiche aperte per cliente">
              <section>
                <p>La rubrica raccoglie tutti i clienti dello studio. Ogni riga mostra codice, ragione sociale, tipo (Società/Persona), P.IVA o CF, città, etichette e numero di pratiche aperte.</p>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Azioni rapide</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li><strong className="text-foreground">Click su una riga</strong>: drawer con dettaglio anagrafica e lista pratiche del cliente.</li>
                  <li><strong className="text-foreground">+ accanto al nome</strong>: apre il wizard nuova pratica con cliente già selezionato.</li>
                  <li><strong className="text-foreground">Header colonna</strong> (codice, ragione sociale, città, pratiche aperte): ordina la lista.</li>
                  <li><strong className="text-foreground">+ Nuovo cliente</strong> in alto a destra: apre la modale per aggiungere un cliente.</li>
                </ul>
              </section>
            </HelpButton>
            <h1 className="font-display text-3xl font-semibold text-foreground">Rubrica clienti</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="relative w-full max-w-sm sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="h-10 w-full rounded-xl border border-border bg-surface-low pl-9 pr-3 text-sm text-foreground outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca cliente o P.IVA"
                value={query}
              />
            </label>
            <Button onClick={() => setNewClientOpen(true)} type="button">
              <Plus className="h-4 w-4" />
              Nuovo cliente
            </Button>
            <V1Hint>
              <Button type="button" variant="outline">
                <LinkIcon className="h-4 w-4" />
                Connetti ad anagrafica esistente
              </Button>
            </V1Hint>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface-low">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-surface-container text-left font-display text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3"><SortButton sort="code">Codice</SortButton></th>
                <th className="px-4 py-3"><SortButton sort="name">Ragione sociale</SortButton></th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">P.IVA</th>
                <th className="px-4 py-3"><SortButton sort="city">Citta</SortButton></th>
                <th className="px-4 py-3">Etichette</th>
                <th className="px-4 py-3 text-right"><SortButton sort="openCount">Pratiche aperte</SortButton></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const openCount = allPractices.filter((practice) => practice.clientId === client.id && practice.status !== "chiusa").length;
                return (
                  <tr
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-container"
                    key={client.id}
                    onClick={() => openClient(client)}
                  >
                    <td className="px-4 py-3 font-label text-xs font-semibold text-muted">{client.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label={`Nuova pratica per ${client.name}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-high hover:text-electric"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/pratiche/nuova?clientId=${client.id}`);
                          }}
                          title="Aggiungi pratica per questo cliente"
                          type="button"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="font-semibold text-foreground">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground-variant">{client.type === "societa" ? "Societa" : "Persona"}</td>
                    <td className="px-4 py-3 font-label text-foreground-variant">{client.vat}</td>
                    <td className="px-4 py-3 text-foreground-variant">{client.city}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
                        {client.labels.map((label) => (
                          <Badge className="cursor-default" key={label} variant="info">{label}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={openCount > 0 ? "warning" : "success"}>{openCount}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet onOpenChange={(open) => !open && closeClient()} open={Boolean(selected)}>
        <SheetContent className="max-w-xl">
          {selected && selectedView && selectedDraft ? (
            <>
              <SheetHeader>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">{selectedView.code}</p>
                <SheetTitle>{selectedView.name}</SheetTitle>
                <SheetDescription>{selectedView.address}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 overflow-y-auto">
                <section className="rounded-2xl border border-border bg-surface-low p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand font-display font-bold text-white">
                      {initials(selectedView.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedView.name}</p>
                      <p className="text-xs text-muted">{selectedView.type === "societa" ? "Societa" : "Persona fisica"}</p>
                    </div>
                  </div>
                  {clientEditError ? (
                    <p className="mb-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                      {clientEditError}
                    </p>
                  ) : null}
                  {clientSaveMessage ? (
                    <p className="mb-3 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                      {clientSaveMessage}
                    </p>
                  ) : null}
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="text-muted">Ragione sociale</span>
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-electric"
                        onChange={(event) => setSelectedDraft((draft) => draft ? { ...draft, name: event.target.value } : draft)}
                        value={selectedDraft.name}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-muted">Indirizzo</span>
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-electric"
                        onChange={(event) => setSelectedDraft((draft) => draft ? { ...draft, address: event.target.value } : draft)}
                        value={selectedDraft.address}
                      />
                    </label>
                    <p><span className="text-muted">P.IVA</span><br />{selectedView.vat}</p>
                    <p><span className="text-muted">CF</span><br />{selectedView.taxCode}</p>
                    <label>
                      <span className="text-muted">Email</span>
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-electric"
                        onChange={(event) => setSelectedDraft((draft) => draft ? { ...draft, email: event.target.value } : draft)}
                        type="email"
                        value={selectedDraft.email}
                      />
                    </label>
                    <label>
                      <span className="text-muted">Telefono</span>
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-electric"
                        onChange={(event) => setSelectedDraft((draft) => draft ? { ...draft, phone: event.target.value } : draft)}
                        value={selectedDraft.phone}
                      />
                    </label>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-muted">Etichette</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDraft.labels.map((label) => (
                        <Badge className="gap-1.5" key={label} variant="info">
                          {label}
                          <button
                            aria-label={`Rimuovi etichetta ${label}`}
                            className="rounded-full text-muted hover:text-foreground"
                            onClick={() => setSelectedDraft((draft) => draft ? { ...draft, labels: draft.labels.filter((item) => item !== label) } : draft)}
                            type="button"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        list="client-label-options"
                        className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-electric"
                        onChange={(event) => setLabelDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addLabel();
                          }
                        }}
                        placeholder="Scegli o crea etichetta"
                        value={labelDraft}
                      />
                      <datalist id="client-label-options">
                        {labelOptions.map((label) => (
                          <option key={label} value={label} />
                        ))}
                      </datalist>
                      <Button onClick={addLabel} type="button" variant="outline">
                        <Plus className="h-4 w-4" />
                        Aggiungi
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    disabled={savingClient || !selectedDraft.name.trim()}
                    onClick={saveSelectedClient}
                    type="button"
                  >
                    {savingClient ? "Salvataggio..." : "Salva modifiche"}
                  </Button>
                </section>

                <section>
                  <p className="mb-3 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Pratiche del cliente</p>
                  <div className="space-y-2">
                    {clientPractices.length ? clientPractices.map((practice) => (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-low p-3 transition-colors hover:bg-surface-high"
                        href={`/pratiche/${practice.code}`}
                        key={practice.id}
                      >
                        <div>
                          <p className="font-label text-xs font-semibold text-electric">{practice.code}</p>
                          <p className="font-semibold text-foreground">{practice.title}</p>
                        </div>
                        <Badge variant={practice.status === "chiusa" ? "success" : "warning"}>
                          {practice.phasesClosed}/{practice.phasesTotal} &middot; {practice.progress}%
                        </Badge>
                      </Link>
                    )) : (
                      <div className="rounded-xl border border-border bg-surface-low p-4 text-sm text-muted">
                        <UserRound className="mb-2 h-4 w-4 text-electric" />
                        Nessuna pratica attiva nel dataset demo.
                      </div>
                    )}
                  </div>
                </section>

                <Button
                  className="border border-danger/40 bg-danger/10 text-danger hover:bg-danger/15"
                  onClick={() => setDeleteConfirmOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina cliente
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <SheetContent className="max-w-md">
          <SheetHeader>
            <SheetTitle>Eliminare cliente?</SheetTitle>
            <SheetDescription>
              {selectedView
                ? `Confermi l'eliminazione di ${selectedView.name}? Se ci sono pratiche aperte il sistema blocchera l'operazione.`
                : "Confermi l'eliminazione del cliente selezionato?"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {clientEditError ? (
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                {clientEditError}
              </p>
            ) : null}
            <Button
              className="w-full border border-danger/40 bg-danger/10 text-danger hover:bg-danger/15"
              disabled={deletingClient}
              onClick={confirmDeleteClient}
              type="button"
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
              {deletingClient ? "Eliminazione..." : "Conferma eliminazione"}
            </Button>
            <Button className="w-full" onClick={() => setDeleteConfirmOpen(false)} type="button" variant="ghost">
              Annulla
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet onOpenChange={setNewClientOpen} open={newClientOpen}>
        <SheetContent className="max-w-lg">
          <SheetHeader>
            <SheetTitle>Nuovo cliente</SheetTitle>
            <SheetDescription>Aggiungi un cliente alla rubrica.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {newClientError ? (
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{newClientError}</p>
            ) : null}
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewClient((value) => ({ ...value, name: event.target.value }))}
              placeholder="Ragione sociale"
              value={newClient.name}
            />
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewClient((value) => ({ ...value, type: event.target.value as NewClientDraft["type"] }))}
              value={newClient.type}
            >
              <option value="societa">Societa</option>
              <option value="persona_fisica">Persona fisica</option>
            </select>
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewClient((value) => ({ ...value, vat: event.target.value }))}
              placeholder="P.IVA (11 cifre) o CF (16 caratteri)"
              value={newClient.vat}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewClient((value) => ({ ...value, email: event.target.value }))}
              placeholder="Email"
              value={newClient.email}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewClient((value) => ({ ...value, phone: event.target.value }))}
              placeholder="Telefono"
              value={newClient.phone}
            />
            <Button className="w-full" disabled={!newClient.name.trim() || creatingClient} onClick={submitNewClient} type="button">
              <Plus className="h-4 w-4" />
              {creatingClient ? "Creazione..." : "Salva cliente"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
