"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EWorkShell } from "@/components/shell/EWorkShell";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/ui/help-button";
import {
  getCategories,
  getTemplate,
  replaceTemplateForCategory,
  type ApiCategory,
  type TemplatePhaseInput,
} from "@/lib/api";
import { useDemoStore } from "@/lib/demo-state";

type DraftPhase = TemplatePhaseInput & { localId: string };

function newDraft(): DraftPhase {
  return {
    localId: `phase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "Nuova fase",
    description: null,
    duration_days: 5,
    default_role: null,
  };
}

export default function CategoryTemplateEditorPage({ params }: { params: { categoryId: string } }) {
  const { categoryId } = params;
  const queryClient = useQueryClient();
  const activeUser = useDemoStore((state) => state.activeUser);
  const [phases, setPhases] = useState<DraftPhase[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const categoryQuery = useQuery({
    queryFn: () => getCategories(),
    queryKey: ["categories"],
  });
  const category: ApiCategory | undefined = categoryQuery.data?.find((c) => c.id === categoryId);

  const templateQuery = useQuery({
    enabled: Boolean(categoryId),
    queryFn: () => getTemplate(categoryId),
    queryKey: ["template", categoryId],
  });

  useEffect(() => {
    if (!templateQuery.data) return;
    setPhases(
      [...templateQuery.data]
        .sort((a, b) => a.order_index - b.order_index)
        .map((tpl, index) => ({
          localId: `phase-${tpl.id ?? index}`,
          name: tpl.name,
          description: tpl.description ?? null,
          duration_days: tpl.duration_days ?? 1,
          default_role: tpl.default_role ?? null,
        })),
    );
  }, [templateQuery.data]);

  function updatePhase(index: number, patch: Partial<DraftPhase>) {
    setPhases((current) => current.map((phase, i) => (i === index ? { ...phase, ...patch } : phase)));
  }

  function removePhase(index: number) {
    setPhases((current) => current.filter((_, i) => i !== index));
  }

  function addPhase() {
    setPhases((current) => [...current, newDraft()]);
  }

  function move(index: number, direction: -1 | 1) {
    setPhases((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: TemplatePhaseInput[] = phases.map((phase) => ({
        name: phase.name.trim() || "Fase",
        description: phase.description?.trim() || null,
        duration_days: Math.max(1, Math.floor(phase.duration_days || 1)),
        default_role: phase.default_role?.trim() || null,
      }));
      await replaceTemplateForCategory(categoryId, payload, activeUser.id);
      await queryClient.invalidateQueries({ queryKey: ["template", categoryId] });
      await queryClient.invalidateQueries({ queryKey: ["template-preview", categoryId] });
      setSavedAt(new Date());
    } catch (err) {
      console.error("template_save_failed", err);
      setError(err instanceof Error ? err.message : "Salvataggio template non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EWorkShell code="Tipologie pratica">
      <main className="min-h-[calc(100vh-120px)] bg-surface px-6 pb-28 pt-6 md:px-10">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Studio / Tipologie</p>
                <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {category ? `Template: ${category.name}` : "Template di categoria"}
                </h1>
                {category?.description ? (
                  <p className="mt-1 text-sm text-muted">{category.description}</p>
                ) : null}
              </div>
              <HelpButton title="Editor template" subtitle="Modifica le fasi standard della categoria">
                <section>
                  <p>Le fasi qui definite vengono proposte come default quando crei una nuova pratica di questa categoria. Le pratiche già create non sono toccate.</p>
                </section>
                <section>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Operazioni</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li><strong className="text-foreground">Nome</strong>: label della fase mostrata sull&apos;albero e nel wizard.</li>
                    <li><strong className="text-foreground">Durata</strong> in giorni: durata di default; al momento della creazione pratica la data effettiva si ricalcola in base ad apertura e scadenza richiesta.</li>
                    <li><strong className="text-foreground">Frecce</strong> a sinistra: cambia l&apos;ordine delle fasi.</li>
                    <li><strong className="text-foreground">Cestino</strong>: rimuove la fase dal template.</li>
                    <li><strong className="text-foreground">+ Aggiungi fase</strong>: aggiunge una nuova fase in coda.</li>
                  </ul>
                </section>
                <section>
                  <p>Salva sostituisce atomicamente tutto il template della categoria. Le modifiche valgono per le pratiche create dopo il salvataggio.</p>
                </section>
              </HelpButton>
            </div>
            <Button asChild variant="outline">
              <Link href="/tipologie">
                <ArrowLeft className="h-4 w-4" />
                Tutte le tipologie
              </Link>
            </Button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</div>
          ) : null}

          <div className="rounded-2xl border border-border bg-surface-low p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Fasi del template</p>
              <Button onClick={addPhase} type="button" variant="outline">
                <Plus className="h-4 w-4" />
                Aggiungi fase
              </Button>
            </div>

            <div className="hidden gap-3 px-3 pb-2 text-[10px] font-display font-semibold uppercase tracking-[0.14em] text-muted md:grid md:grid-cols-[60px_1fr_140px_60px]">
              <span>Ordine</span>
              <span>Nome fase</span>
              <span>Durata</span>
              <span />
            </div>

            <div className="space-y-2">
              {phases.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-surface-container p-4 text-center text-sm text-muted">
                  Nessuna fase. Aggiungine una con &quot;+ Aggiungi fase&quot;.
                </p>
              ) : null}
              {phases.map((phase, index) => (
                <div
                  className="grid items-center gap-3 rounded-xl border border-border bg-surface-container p-3 text-sm md:grid-cols-[60px_1fr_140px_60px]"
                  key={phase.localId}
                >
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Sposta su"
                      className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-high hover:text-foreground disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      type="button"
                    >
                      ▲
                    </button>
                    <span className="font-label text-xs text-muted">#{index + 1}</span>
                    <button
                      aria-label="Sposta giu"
                      className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-high hover:text-foreground disabled:opacity-40"
                      disabled={index === phases.length - 1}
                      onClick={() => move(index, 1)}
                      type="button"
                    >
                      ▼
                    </button>
                  </div>
                  <input
                    className="rounded-lg bg-surface-low px-2 py-1.5 outline-none"
                    onChange={(event) => updatePhase(index, { name: event.target.value })}
                    placeholder="Nome fase"
                    value={phase.name}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      className="w-20 rounded-lg bg-surface-low px-2 py-1.5 outline-none"
                      min={1}
                      onChange={(event) => updatePhase(index, { duration_days: Number(event.target.value) })}
                      type="number"
                      value={phase.duration_days}
                    />
                    <span className="text-xs text-muted">gg</span>
                  </div>
                  <button
                    aria-label="Rimuovi fase"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    onClick={() => removePhase(index)}
                    title="Rimuovi fase"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface-low/95 px-6 py-3 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {savedAt ? `Salvato alle ${savedAt.toLocaleTimeString("it-IT")}` : "Le modifiche valgono per le pratiche create dopo il salvataggio."}
            </p>
            <div className="flex items-center gap-2">
              <Button asChild type="button" variant="ghost">
                <Link href="/tipologie">Annulla</Link>
              </Button>
              <Button disabled={saving} onClick={save} type="button">
                <Save className="h-4 w-4" />
                {saving ? "Salvataggio..." : "Salva template"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </EWorkShell>
  );
}
