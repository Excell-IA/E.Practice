"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plug, Route, Sparkles, UserSquare2, UsersRound, Workflow } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { V1Hint } from "@/components/ui/v1-hint";
import { getContacts, getPractices } from "@/lib/api";
import { directoryPractices } from "@/lib/demo-directory";
import { mapApiPracticeToDirectoryPractice } from "@/lib/mappers/practice-list";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  href?: string;
  icon: ReactNode;
  title: string;
  kpi?: string;
  description: string;
  v1?: boolean;
};

function DashboardCard({ description, href, icon, kpi, title, v1 }: DashboardCardProps) {
  const inner = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "cursor-pointer hover:border-electric/40 hover:bg-surface-high",
        v1 && "border-dashed",
      )}
    >
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric/10 text-electric">
            {icon}
          </div>
          <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        </div>
        {kpi ? (
          <p className="font-display text-2xl font-semibold text-foreground">{kpi}</p>
        ) : null}
        <p className="text-sm leading-6 text-foreground-variant">{description}</p>
      </CardContent>
    </Card>
  );

  if (v1) {
    return <V1Hint className="block h-full">{inner}</V1Hint>;
  }
  if (href) {
    return (
      <Link className="block h-full" href={href}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export function HomeDashboardClient() {
  const contactsQuery = useQuery({
    queryFn: getContacts,
    queryKey: ["contacts"],
  });
  const practicesQuery = useQuery({
    queryFn: () => getPractices(),
    queryKey: ["practices"],
  });
  const practices =
    practicesQuery.data?.items.map((practice) =>
      mapApiPracticeToDirectoryPractice(practice, contactsQuery.data),
    ) ?? directoryPractices;
  const clientsCount = contactsQuery.data?.length ?? 0;
  const practicesOpen = practices.filter((practice) => practice.status !== "chiusa").length;
  const practicesInProgress = practices.filter(
    (practice) => practice.progress > 0 && practice.status !== "chiusa",
  ).length;
  const featuredPracticeCode = practices[0]?.code ?? "PR-2026-001";

  return (
    <main className="min-h-[calc(100vh-120px)] bg-surface">
      <header className="border-b border-border bg-surface-low/80 px-6 py-[14px] md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
              Cliente Beta Testing
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-variant">
              Gestione pratiche dello studio: rubrica clienti, pratiche aperte e la vista albero
              cronologica. Da qui raggiungi tutte le sezioni del modulo.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:px-10 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          description="Anagrafica dei clienti dello studio con pratiche aperte e contatti."
          href="/clienti"
          icon={<UsersRound className="h-5 w-5" />}
          kpi={`${clientsCount} clienti`}
          title="Rubrica clienti"
        />
        <DashboardCard
          description={
            practicesInProgress > 0
              ? `${practicesInProgress} in corso, restanti aperte`
              : "Tutte le pratiche aperte dello studio"
          }
          href="/pratiche"
          icon={<Workflow className="h-5 w-5" />}
          kpi={`${practicesOpen} pratiche aperte`}
          title="Pratiche"
        />
        <DashboardCard
          description="Linea del tempo della pratica con fasi, eventi e note. Il differenziatore di E.Practice."
          href={`/pratiche/${featuredPracticeCode}`}
          icon={<Route className="h-5 w-5" />}
          title="Vista albero"
        />
        <DashboardCard
          description="In arrivo nella V1. Legge i documenti caricati e propone i dati per la pratica."
          icon={<Sparkles className="h-5 w-5" />}
          title="Lettore AI"
          v1
        />
        <DashboardCard
          description="In arrivo nella V1. Sincronizza anagrafiche e movimenti con il gestionale dello studio."
          icon={<Plug className="h-5 w-5" />}
          title="Connettori ERP"
          v1
        />
        <DashboardCard
          description="Categorie di pratica con il loro template di fasi. Modificabile."
          href="/tipologie"
          icon={<FolderKanban className="h-5 w-5" />}
          title="Tipologie pratica"
        />
        <DashboardCard
          description="Operatori dello studio, ruoli e stato attivo."
          href="/utenti"
          icon={<UserSquare2 className="h-5 w-5" />}
          title="Utenti"
        />
      </section>
    </main>
  );
}
