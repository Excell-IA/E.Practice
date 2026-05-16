"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { PracticeTabs } from "@/components/practice/PracticeTabs";
import { getPracticeDetail, getPractices } from "@/lib/api";
import { useDemoStore } from "@/lib/demo-state";
import { mapPracticeDetailToUi } from "@/lib/mappers/practice";

type PracticeDetailClientProps = {
  code: string;
};

export function PracticeDetailClient({ code }: PracticeDetailClientProps) {
  const practice = useDemoStore((state) => state.practice);
  const phases = useDemoStore((state) => state.phases);
  const events = useDemoStore((state) => state.events);
  const users = useDemoStore((state) => state.users);
  const applyAction = useDemoStore((state) => state.applyAction);
  const practiceListQuery = useQuery({
    queryFn: () => getPractices(),
    queryKey: ["practices", code],
  });
  const apiPracticeId = useMemo(() => {
    const items = practiceListQuery.data?.items ?? [];
    return (
      items.find((item) => item.code === code)?.id ??
      items.find((item) => item.title.includes("Acciaierie Valgobbia"))?.id ??
      items[0]?.id
    );
  }, [code, practiceListQuery.data?.items]);
  const practiceDetailQuery = useQuery({
    enabled: Boolean(apiPracticeId),
    queryFn: () => getPracticeDetail(apiPracticeId ?? ""),
    queryKey: ["practice-detail", apiPracticeId],
  });

  useEffect(() => {
    if (!practiceDetailQuery.data) return;
    applyAction({
      detail: mapPracticeDetailToUi(practiceDetailQuery.data, users),
      type: "hydrate_from_api",
    });
  }, [applyAction, practiceDetailQuery.data, users]);

  return (
    <main className="flex h-[calc(100vh-120px)] flex-col overflow-hidden">
      {practiceDetailQuery.isError ? (
        <div className="shrink-0 border-b border-warning/30 bg-warning/10 px-6 py-2 text-sm text-warning md:px-10">
          Backend non raggiungibile: sto mostrando i dati demo locali.
        </div>
      ) : null}
      <div className="shrink-0">
        <PracticeHeader phases={phases} practice={practice} />
      </div>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-6 md:px-10">
        <PracticeTabs events={events} phases={phases} practice={practice} />
      </section>
    </main>
  );
}
