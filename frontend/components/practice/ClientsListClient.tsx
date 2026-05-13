"use client";

import { Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { directoryClients, directoryPractices, type DirectoryClient } from "@/lib/demo-directory";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ClientsListClient() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DirectoryClient | null>(null);
  const clients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return directoryClients;
    return directoryClients.filter((client) =>
      `${client.name} ${client.vat} ${client.taxCode}`.toLowerCase().includes(needle),
    );
  }, [query]);
  const clientPractices = selected ? directoryPractices.filter((practice) => practice.clientId === selected.id) : [];

  return (
    <main className="min-h-[calc(100vh-60px)] bg-surface px-6 py-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Rubrica clienti</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Clienti Studio Leali</h1>
          </div>
          <label className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low pl-9 pr-3 text-sm text-foreground outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca cliente o P.IVA"
              value={query}
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-low">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-surface-container text-left font-display text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3">Codice</th>
                <th className="px-4 py-3">Ragione sociale</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">P.IVA</th>
                <th className="px-4 py-3">Citta</th>
                <th className="px-4 py-3">Etichette</th>
                <th className="px-4 py-3 text-right">Pratiche aperte</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const openCount = directoryPractices.filter((practice) => practice.clientId === client.id && practice.status !== "chiusa").length;
                return (
                  <tr
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-container"
                    key={client.id}
                    onClick={() => setSelected(client)}
                  >
                    <td className="px-4 py-3 font-label text-xs font-semibold text-muted">{client.code}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{client.name}</td>
                    <td className="px-4 py-3 text-foreground-variant">{client.type === "societa" ? "Societa" : "Persona"}</td>
                    <td className="px-4 py-3 font-label text-foreground-variant">{client.vat}</td>
                    <td className="px-4 py-3 text-foreground-variant">{client.city}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {client.labels.map((label) => (
                          <Badge key={label} variant="info">{label}</Badge>
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

      <Sheet onOpenChange={(open) => !open && setSelected(null)} open={Boolean(selected)}>
        <SheetContent className="max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">{selected.code}</p>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.address}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 overflow-y-auto">
                <section className="rounded-2xl border border-border bg-surface-low p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand font-display font-bold text-white">
                      {initials(selected.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selected.name}</p>
                      <p className="text-xs text-muted">{selected.type === "societa" ? "Societa" : "Persona fisica"}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <p><span className="text-muted">P.IVA</span><br />{selected.vat}</p>
                    <p><span className="text-muted">CF</span><br />{selected.taxCode}</p>
                    <p><span className="text-muted">Email</span><br />{selected.email}</p>
                    <p><span className="text-muted">Telefono</span><br />{selected.phone}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.labels.map((label) => <Badge key={label} variant="info">{label}</Badge>)}
                  </div>
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
                        <Badge variant={practice.status === "chiusa" ? "success" : "warning"}>{practice.progress}%</Badge>
                      </Link>
                    )) : (
                      <div className="rounded-xl border border-border bg-surface-low p-4 text-sm text-muted">
                        <UserRound className="mb-2 h-4 w-4 text-electric" />
                        Nessuna pratica attiva nel dataset demo.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
