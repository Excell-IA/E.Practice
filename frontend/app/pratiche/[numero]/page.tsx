import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { PracticeTabs } from "@/components/practice/PracticeTabs";
import { EWorkShell } from "@/components/shell/EWorkShell";
import type { Practice, PracticeEvent, PracticePhase, User } from "@/lib/types";

const users = {
  sara: {
    id: "11111111-1111-4111-8111-000000000001",
    initials: "SS",
    name: "Sara Scalvini",
    role: "Senior accountant",
  },
  marco: {
    id: "11111111-1111-4111-8111-000000000002",
    initials: "MR",
    name: "Marco Rinaldi",
    role: "Revisore",
  },
  elena: {
    id: "11111111-1111-4111-8111-000000000003",
    initials: "EF",
    name: "Elena Ferrari",
    role: "Partner",
  },
} satisfies Record<string, User>;

const practice: Practice = {
  id: "22222222-2222-4222-8222-000000000042",
  category: "Bilancio",
  categoryIcon: "folder-kanban",
  client: {
    id: "33333333-3333-4333-8333-000000000001",
    city: "Lumezzane (BS)",
    industry: "Industria siderurgica",
    name: "Acciaierie Valgobbia SRL",
    vatNumber: "P.IVA 03481240987",
  },
  code: "PR-2026-042",
  description:
    "Percorso operativo per chiusura contabile, redazione bozza, verifica quadrature e deposito del bilancio annuale.",
  dueDate: "2026-04-30",
  labels: [
    { id: "label-1", name: "Urgente", tone: "warning" },
    { id: "label-2", name: "Studio Leali", tone: "info" },
    { id: "label-3", name: "Demo", tone: "success" },
  ],
  progress: 50,
  responsible: users.sara,
  startDate: "2026-01-22",
  status: "in_progress",
  title: "Bilancio 2025 Acciaierie Valgobbia",
};

type PhaseSeed = [string, number, string, PracticePhase["status"], string, User, number, number];

const phaseSeeds: PhaseSeed[] = [
  ["phase-01", 1, "Raccolta scritture", "done", "2026-01-22", users.sara, 2, 3],
  ["phase-02", 2, "Riconciliazione conti", "done", "2026-02-05", users.sara, 4, 2],
  ["phase-03", 3, "Scritture assestamento", "done", "2026-02-12", users.marco, 3, 2],
  ["phase-04", 4, "Redazione bozza", "in_progress", "2026-03-15", users.sara, 2, 2],
  ["phase-05", 5, "Verifica quadrature", "pending", "2026-03-25", users.marco, 0, 0],
  ["phase-06", 6, "Revisione titolare", "pending", "2026-04-02", users.elena, 0, 0],
  ["phase-07", 7, "Documenti assembleari", "pending", "2026-04-10", users.sara, 0, 0],
  ["phase-08", 8, "Approvazione soci", "pending", "2026-04-18", users.elena, 0, 0],
  ["phase-09", 9, "Deposito CCIAA", "pending", "2026-04-25", users.marco, 0, 0],
  ["phase-10", 10, "Archiviazione", "pending", "2026-04-30", users.sara, 0, 0],
];

const phases: PracticePhase[] = phaseSeeds.map(([id, order, title, status, date, assignee, notesCount, attachmentsCount]) => ({
  id,
  assignee,
  attachmentsCount,
  description: `Attivita operativa: ${title.toString().toLowerCase()} per ${practice.client.name}.`,
  dueDate: date,
  notesCount,
  order,
  plannedDate: date,
  practiceId: practice.id,
  status,
  title,
}));

const events: PracticeEvent[] = [
  {
    id: "event-01",
    author: users.sara,
    description: "Telefonata con amministrazione cliente per allineare movimenti bancari mancanti.",
    occurredAt: "2026-02-02",
    phaseId: "phase-02",
    practiceId: practice.id,
    title: "Call cliente",
    type: "call",
  },
  {
    id: "event-02",
    author: users.marco,
    description: "Invio richiesta integrazione documenti per immobilizzazioni e leasing.",
    occurredAt: "2026-02-18",
    phaseId: "phase-03",
    practiceId: practice.id,
    title: "Mail docs",
    type: "mail",
  },
  {
    id: "event-03",
    author: users.elena,
    description: "Segnalata attenzione su scadenza deposito e verifica approvazione assembleare.",
    occurredAt: "2026-03-12",
    phaseId: "phase-04",
    practiceId: practice.id,
    title: "Alert scadenza",
    type: "warning",
  },
];

type PracticeDetailPageProps = {
  params: {
    numero: string;
  };
};

export default function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  return (
    <EWorkShell code={params.numero}>
      <main className="min-h-[calc(100vh-4rem)]">
        <PracticeHeader practice={practice} />
        <section className="mx-auto max-w-7xl px-6 py-6 md:px-10">
          <PracticeTabs events={events} phases={phases} practice={practice} />
        </section>
      </main>
    </EWorkShell>
  );
}
