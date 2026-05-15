"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";

import { EWorkShell } from "@/components/shell/EWorkShell";
import { V1Hint } from "@/components/ui/v1-hint";
import { getCategories, getTemplatePreview, type ApiCategory } from "@/lib/api";

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
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{category.group_name}</p>
            <h3 className="font-display text-lg font-semibold text-foreground">{category.name}</h3>
            {category.description ? <p className="mt-1 text-xs text-muted">{category.description}</p> : null}
          </div>
        </div>
        <V1Hint label="Disponibile in V1">
          <button
            className="rounded-lg border border-electric/40 bg-electric/10 px-3 py-1 text-xs font-semibold text-electric"
            type="button"
          >
            Modifica template
          </button>
        </V1Hint>
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
  const categoriesQuery = useQuery({
    queryFn: () => getCategories(),
    queryKey: ["categories"],
  });
  const categories = categoriesQuery.data ?? [];

  return (
    <EWorkShell code="Tipologie pratica">
      <main className="min-h-[calc(100vh-120px)] bg-surface px-6 py-6 md:px-10">
        <div className="mx-auto max-w-screen-2xl">
          <div className="mb-5">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Studio</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Tipologie pratica</h1>
            <p className="mt-1 text-sm text-muted">
              Ogni tipologia ha un template di fasi standard che viene proposto quando crei una nuova pratica.
              Puoi modificare le fasi sulla singola pratica; per cambiare il template di default arriverà la modifica in V1.
            </p>
          </div>

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
