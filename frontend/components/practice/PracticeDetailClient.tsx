"use client";

import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { PracticeTabs } from "@/components/practice/PracticeTabs";
import { useDemoStore } from "@/lib/demo-state";

export function PracticeDetailClient() {
  const practice = useDemoStore((state) => state.practice);
  const phases = useDemoStore((state) => state.phases);
  const events = useDemoStore((state) => state.events);

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <PracticeHeader practice={practice} />
      <section className="mx-auto max-w-7xl px-6 py-6 md:px-10">
        <PracticeTabs events={events} phases={phases} practice={practice} />
      </section>
    </main>
  );
}
