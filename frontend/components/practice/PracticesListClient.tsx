"use client";

import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPractices } from "@/lib/api";
import { directoryPractices, type DirectoryPractice } from "@/lib/demo-directory";
import { mapApiPracticeToDirectoryPractice } from "@/lib/mappers/practice-list";
import { cn } from "@/lib/utils";

type PracticeFilter = "all" | "open" | "progress" | "done" | "late";

const filters: { id: PracticeFilter; label: string }[] = [
  { id: "all", label: "Tutte" },
  { id: "open", label: "Aperte" },
  { id: "progress", label: "In corso" },
  { id: "done", label: "Completate" },
  { id: "late", label: "In ritardo" },
];

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

function isLate(practice: DirectoryPractice) {
  return practice.status !== "chiusa" && differenceInCalendarDays(new Date(practice.dueDate), new Date("2026-05-13")) < 0;
}

function matchesFilter(practice: DirectoryPractice, filter: PracticeFilter) {
  if (filter === "all") return true;
  if (filter === "open") return practice.status === "aperta";
  if (filter === "progress") return practice.status === "in_corso" || practice.status === "in_attesa";
  if (filter === "done") return practice.status === "chiusa";
  return isLate(practice);
}

function urgencyLabel(practice: DirectoryPractice) {
  const days = differenceInCalendarDays(new Date(practice.dueDate), new Date("2026-05-13"));
  if (practice.status === "chiusa") return { label: "chiusa", variant: "success" as const };
  if (days < 0) return { label: `${Math.abs(days)} gg fa`, variant: "danger" as const };
  if (days <= 7) return { label: `${days} gg`, variant: "warning" as const };
  return { label: `${days} gg`, variant: "info" as const };
}

export function PracticesListClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PracticeFilter>("all");
  const practicesQuery = useQuery({
    queryFn: () => getPractices(),
    queryKey: ["practices"],
  });
  const sourcePractices = useMemo(() => {
    const apiPractices = practicesQuery.data?.items.map(mapApiPracticeToDirectoryPractice) ?? [];
    return apiPractices.length ? apiPractices : directoryPractices;
  }, [practicesQuery.data?.items]);
  const practices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sourcePractices.filter((practice) => {
      const text = `${practice.code} ${practice.title} ${practice.clientName}`.toLowerCase();
      return matchesFilter(practice, filter) && (!needle || text.includes(needle));
    });
  }, [filter, query, sourcePractices]);

  function count(filterId: PracticeFilter) {
    return sourcePractices.filter((practice) => matchesFilter(practice, filterId)).length;
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-surface px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Home</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Elenco pratiche</h1>
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

        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 font-label text-sm font-semibold text-muted transition-colors",
                filter === item.id && "border-electric/40 bg-electric/10 text-electric",
              )}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
              <span className="rounded-full bg-surface-high px-2 py-0.5 text-[11px]">{count(item.id)}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-low">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead className="bg-surface-container text-left font-display text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Titolo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Responsabile</th>
                <th className="px-4 py-3">Scadenza</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {practices.map((practice) => {
                const urgency = urgencyLabel(practice);
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
                      <div className="flex items-center gap-2">
                        <span className="font-label text-foreground-variant">{format(new Date(practice.dueDate), "dd/MM/yyyy", { locale: it })}</span>
                        <Badge variant={urgency.variant}>{urgency.label}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(practice.status)}>{statusLabel(practice.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-high">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${practice.progress}%` }} />
                        </div>
                        <span className="font-label text-xs font-semibold text-muted">{practice.progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
