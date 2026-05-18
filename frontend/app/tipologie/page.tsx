"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EWorkShell } from "@/components/shell/EWorkShell";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/ui/help-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createCategory, getCategories, getTemplatePreview, type ApiCategory, type CategoryCreateInput } from "@/lib/api";
import { useDemoStore } from "@/lib/demo-state";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function CategoryCard({ category }: { category: ApiCategory }) {
  const previewQuery = useQuery({
    queryFn: () => getTemplatePreview(category.id, todayIso()),
    queryKey: ["template-preview", category.id],
  });
  const phases = previewQuery.data?.phases ?? [];

  return (
    <article className="rounded-2xl border border-border bg-surface-low p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${category.color ?? "#666"}22`, color: category.color ?? "#666" }}
          >
            <FolderKanban className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{category.name}</h3>
            {category.description ? <p className="mt-1 text-xs text-muted">{category.description}</p> : null}
          </div>
        </div>
        <Link
          className="rounded-lg border border-electric/40 bg-electric/10 px-3 py-1 text-xs font-semibold text-electric transition-colors hover:bg-electric/20"
          href={`/tipologie/${category.id}`}
        >
          Modifica template
        </Link>
      </header>

      {previewQuery.isLoading ? (
        <p className="text-sm text-muted">Caricamento fasi...</p>
      ) : phases.length === 0 ? (
        <p className="text-sm text-muted">Nessuna fase nel template di questa categoria.</p>
      ) : (
        <ol className="space-y-2">
          {phases.map((phase) => (
            <li
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-container px-3 py-2 text-sm"
              key={phase.order_index}
            >
              <span className="flex items-center gap-3">
                <span className="font-label text-xs font-bold text-muted">#{phase.order_index}</span>
                <span className="font-semibold text-foreground">{phase.name}</span>
              </span>
              <span className="font-label text-xs text-muted">{phase.duration_days} giorni</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const activeUser = useDemoStore((state) => state.activeUser);
  const categoriesQuery = useQuery({
    queryFn: () => getCategories(),
    queryKey: ["categories"],
  });
  const categories = categoriesQuery.data ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CategoryCreateInput>({ name: "", color: "#7c3aed", description: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (input: CategoryCreateInput) => createCategory(input, activeUser.id),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCreateOpen(false);
      setForm({ name: "", color: "#7c3aed", description: "" });
      setCreateError(null);
      router.push(`/tipologie/${created.id}`);
    },
    onError: (err: Error) => {
      setCreateError(err.message);
    },
  });

  function submitCreate() {
    setCreateError(null);
    const name = form.name.trim();
    if (!name) {
      setCreateError("Il nome della tipologia non puo' essere vuoto.");
      return;
    }
    createMutation.mutate({
      name,
      group_name: null,
      color: form.color || null,
      description: form.description?.trim() || null,
    });
  }

  return (
    <EWorkShell code="Tipologie pratica">
      <main className="min-h-[calc(100vh-120px)] bg-surface px-6 py-6 md:px-10">
        <div>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <HelpButton title="Tipologie pratica" subtitle="Template di fasi standard per categoria">
                <section>
                  <p>Le tipologie pratica raggruppano i lavori dello studio per categoria (es. Bilancio, Contenzioso, Costituzione). Ogni tipologia ha un <strong className="text-foreground">template</strong> di fasi standard.</p>
                </section>
                <section>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Quando crei una pratica</p>
                  <p className="mt-2">Le fasi del template vengono proposte in automatico nello step 2 del wizard. Puoi modificarle (nome, data, assegnatario) solo per quella pratica.</p>
                </section>
                <section>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Modifica template</p>
                  <p className="mt-2">Click su <strong className="text-foreground">Modifica template</strong> in una categoria → editor delle fasi default. Le modifiche valgono per le pratiche create da quel momento in poi.</p>
                </section>
                <section>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Crea / elimina tipologia</p>
                  <p className="mt-2">Usa <strong className="text-foreground">+ Nuova tipologia</strong> in alto a destra per aggiungerne una. Dentro l&apos;editor template c&apos;e&apos; il bottone <strong className="text-foreground">Elimina tipologia</strong>: bloccato se ci sono pratiche associate.</p>
                </section>
              </HelpButton>
              <div>
                <h1 className="font-display text-3xl font-semibold text-foreground">Tipologie pratica</h1>
                <p className="mt-1 text-sm text-muted">
                  Ogni tipologia ha un template di fasi standard che viene proposto quando crei una nuova pratica.
                  Click su <strong className="text-foreground">Modifica template</strong> per personalizzare le fasi della categoria.
                </p>
              </div>
            </div>
            <Button onClick={() => { setCreateError(null); setCreateOpen(true); }} type="button">
              <Plus className="h-4 w-4" />
              Nuova tipologia
            </Button>
          </div>

          <Sheet onOpenChange={setCreateOpen} open={createOpen}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Nuova tipologia pratica</SheetTitle>
                <SheetDescription>
                  Inserisci nome, colore e descrizione. Dopo la creazione vieni portato direttamente
                  nell&apos;editor per definire le fasi del template.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="font-label text-xs font-semibold uppercase tracking-wide text-muted">Nome *</span>
                  <input
                    autoFocus
                    className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm text-foreground outline-none focus:border-electric"
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="es. Successioni"
                    value={form.name}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="font-label text-xs font-semibold uppercase tracking-wide text-muted">Colore</span>
                  <div className="flex items-center gap-3">
                    <input
                      className="h-10 w-16 cursor-pointer rounded-xl border border-border bg-surface-low outline-none"
                      onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                      type="color"
                      value={form.color ?? "#7c3aed"}
                    />
                    <span className="font-label text-xs text-muted">{form.color}</span>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className="font-label text-xs font-semibold uppercase tracking-wide text-muted">Descrizione</span>
                  <textarea
                    className="min-h-20 w-full resize-none rounded-xl border border-border bg-surface-low px-3 py-2 text-sm text-foreground outline-none focus:border-electric"
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Breve descrizione opzionale"
                    value={form.description ?? ""}
                  />
                </label>
              </div>

              {createError ? (
                <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                  {createError}
                </p>
              ) : null}

              <div className="mt-auto flex flex-col gap-2 pt-6">
                <Button
                  className="w-full"
                  disabled={createMutation.isPending || !form.name.trim()}
                  onClick={submitCreate}
                  type="button"
                >
                  {createMutation.isPending ? "Creazione..." : "Crea tipologia"}
                </Button>
                <Button
                  className="w-full"
                  disabled={createMutation.isPending}
                  onClick={() => setCreateOpen(false)}
                  type="button"
                  variant="ghost"
                >
                  Annulla
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {categoriesQuery.isLoading ? (
            <p className="text-sm text-muted">Caricamento tipologie...</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => (
                <CategoryCard category={category} key={category.id} />
              ))}
            </div>
          )}
        </div>
      </main>
    </EWorkShell>
  );
}
