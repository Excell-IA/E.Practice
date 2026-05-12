"use client";

import { create } from "zustand";

import type { EventType, Practice, PracticeEvent, PracticePhase, User } from "@/lib/types";

export type DemoRole = "admin" | "editor" | "viewer";

export type DemoUser = User & {
  avatarColor: string;
  permission: DemoRole;
};

export type DemoNote = {
  id: string;
  phaseId: string;
  author: DemoUser;
  body: string;
  createdAt: string;
};

export const DEMO_USERS = [
  {
    id: "11111111-1111-4111-8111-000000000001",
    initials: "MB",
    name: "Mario Bonometti",
    role: "Titolare",
    avatarColor: "#14532d",
    permission: "admin",
  },
  {
    id: "11111111-1111-4111-8111-000000000002",
    initials: "SS",
    name: "Sara Salvi",
    role: "Senior",
    avatarColor: "#0f766e",
    permission: "editor",
  },
  {
    id: "11111111-1111-4111-8111-000000000003",
    initials: "LF",
    name: "Luca Ferrari",
    role: "Junior",
    avatarColor: "#ea580c",
    permission: "editor",
  },
  {
    id: "11111111-1111-4111-8111-000000000004",
    initials: "PV",
    name: "Paolo Verdi",
    role: "Esterno",
    avatarColor: "#6b7280",
    permission: "viewer",
  },
] as const satisfies readonly DemoUser[];

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
  responsible: DEMO_USERS[0],
  startDate: "2026-01-22",
  status: "in_progress",
  title: "Bilancio 2025 Acciaierie Valgobbia",
};

type PhaseSeed = [string, number, string, PracticePhase["status"], string, DemoUser, number, number];

const phaseSeeds: PhaseSeed[] = [
  ["phase-01", 1, "Raccolta scritture", "done", "2026-01-22", DEMO_USERS[1], 2, 3],
  ["phase-02", 2, "Riconciliazione conti", "done", "2026-02-05", DEMO_USERS[1], 4, 2],
  ["phase-03", 3, "Scritture assestamento", "done", "2026-02-12", DEMO_USERS[2], 3, 2],
  ["phase-04", 4, "Redazione bozza", "in_progress", "2026-03-15", DEMO_USERS[1], 2, 2],
  ["phase-05", 5, "Verifica quadrature", "pending", "2026-03-25", DEMO_USERS[2], 0, 0],
  ["phase-06", 6, "Revisione titolare", "pending", "2026-04-02", DEMO_USERS[0], 0, 0],
  ["phase-07", 7, "Documenti assembleari", "pending", "2026-04-10", DEMO_USERS[1], 0, 0],
  ["phase-08", 8, "Approvazione soci", "pending", "2026-04-18", DEMO_USERS[0], 0, 0],
  ["phase-09", 9, "Deposito CCIAA", "pending", "2026-04-25", DEMO_USERS[2], 0, 0],
  ["phase-10", 10, "Archiviazione", "pending", "2026-04-30", DEMO_USERS[1], 0, 0],
];

const initialPhases: PracticePhase[] = phaseSeeds.map(
  ([id, order, title, status, date, assignee, notesCount, attachmentsCount]) => ({
    id,
    assignee,
    attachmentsCount,
    description: `Attivita operativa: ${title.toLowerCase()} per ${practice.client.name}.`,
    dueDate: date,
    notesCount,
    order,
    plannedDate: date,
    practiceId: practice.id,
    status,
    title,
  }),
);

const initialEvents: PracticeEvent[] = [
  {
    id: "event-01",
    author: DEMO_USERS[1],
    description: "Telefonata con amministrazione cliente per allineare movimenti bancari mancanti.",
    occurredAt: "2026-02-02",
    phaseId: "phase-02",
    practiceId: practice.id,
    title: "Call cliente",
    type: "call",
  },
  {
    id: "event-02",
    author: DEMO_USERS[2],
    description: "Invio richiesta integrazione documenti per immobilizzazioni e leasing.",
    occurredAt: "2026-02-18",
    phaseId: "phase-03",
    practiceId: practice.id,
    title: "Mail docs",
    type: "mail",
  },
  {
    id: "event-03",
    author: DEMO_USERS[0],
    description: "Segnalata attenzione su scadenza deposito e verifica approvazione assembleare.",
    occurredAt: "2026-03-12",
    phaseId: "phase-04",
    practiceId: practice.id,
    title: "Alert scadenza",
    type: "warning",
  },
];

const initialNotes: DemoNote[] = [
  {
    id: "note-01",
    author: DEMO_USERS[1],
    body: "Bozza avviata, in attesa del dettaglio immobilizzazioni aggiornato.",
    createdAt: "2026-03-12T10:30:00",
    phaseId: "phase-04",
  },
  {
    id: "note-02",
    author: DEMO_USERS[0],
    body: "Verificare esposizione leasing prima della revisione titolare.",
    createdAt: "2026-03-13T15:15:00",
    phaseId: "phase-04",
  },
];

type DemoAction =
  | { type: "set_user"; userId: string }
  | { type: "complete_phase"; phaseId: string }
  | { type: "reopen_phase"; phaseId: string }
  | { type: "skip_phase"; phaseId: string }
  | { type: "set_phase_status"; phaseId: string; status: PracticePhase["status"] }
  | { type: "assign_phase"; phaseId: string; userId: string }
  | { type: "add_note"; phaseId: string; body: string }
  | { type: "create_event"; phaseId: string; eventType: EventType; title: string; description: string; occurredAt: string };

type DemoState = {
  activeUser: DemoUser;
  users: readonly DemoUser[];
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
  notes: DemoNote[];
  applyAction: (action: DemoAction) => void;
};

function withProgress(practiceValue: Practice, phases: PracticePhase[]) {
  const completed = phases.filter((phase) => phase.status === "done" || phase.status === "skipped").length;
  return { ...practiceValue, progress: Math.round((completed / phases.length) * 100) };
}

function setSingleInProgress(phases: PracticePhase[], phaseId: string) {
  return phases.map((phase): PracticePhase => {
    const status: PracticePhase["status"] =
      phase.id === phaseId ? "in_progress" : phase.status === "in_progress" ? "pending" : phase.status;
    return { ...phase, status };
  });
}

export const useDemoStore = create<DemoState>((set) => ({
  activeUser: DEMO_USERS[0],
  users: DEMO_USERS,
  practice,
  phases: initialPhases,
  events: initialEvents,
  notes: initialNotes,
  applyAction: (action) =>
    set((state) => {
      if (action.type === "set_user") {
        return { activeUser: state.users.find((user) => user.id === action.userId) ?? state.activeUser };
      }

      if (state.activeUser.permission === "viewer") {
        return state;
      }

      if (action.type === "complete_phase") {
        const current = state.phases.find((phase) => phase.id === action.phaseId);
        const next = state.phases.find((phase) => phase.order === (current?.order ?? 0) + 1);
        const phases = state.phases.map((phase) => {
          if (phase.id === action.phaseId) return { ...phase, status: "done" as const };
          if (next && phase.id === next.id && phase.status === "pending") return { ...phase, status: "in_progress" as const };
          return phase;
        });
        return { phases, practice: withProgress(state.practice, phases) };
      }

      if (action.type === "reopen_phase") {
        const phases = setSingleInProgress(state.phases, action.phaseId);
        return { phases, practice: withProgress(state.practice, phases) };
      }

      if (action.type === "skip_phase") {
        const phases = state.phases.map((phase) => (phase.id === action.phaseId ? { ...phase, status: "skipped" as const } : phase));
        return { phases, practice: withProgress(state.practice, phases) };
      }

      if (action.type === "set_phase_status") {
        const phases =
          action.status === "in_progress"
            ? setSingleInProgress(state.phases, action.phaseId)
            : state.phases.map((phase) => (phase.id === action.phaseId ? { ...phase, status: action.status } : phase));
        return { phases, practice: withProgress(state.practice, phases) };
      }

      if (action.type === "assign_phase" && state.activeUser.permission === "admin") {
        const assignee = state.users.find((user) => user.id === action.userId);
        if (!assignee) return state;
        return {
          phases: state.phases.map((phase) => (phase.id === action.phaseId ? { ...phase, assignee } : phase)),
        };
      }

      if (action.type === "add_note") {
        const note: DemoNote = {
          id: `note-${Date.now()}`,
          author: state.activeUser,
          body: action.body,
          createdAt: new Date().toISOString(),
          phaseId: action.phaseId,
        };
        return {
          notes: [note, ...state.notes],
          phases: state.phases.map((phase) =>
            phase.id === action.phaseId ? { ...phase, notesCount: phase.notesCount + 1 } : phase,
          ),
        };
      }

      if (action.type === "create_event") {
        const event: PracticeEvent = {
          id: `event-${Date.now()}`,
          author: state.activeUser,
          description: action.description,
          occurredAt: action.occurredAt,
          phaseId: action.phaseId,
          practiceId: state.practice.id,
          title: action.title,
          type: action.eventType,
        };
        return { events: [...state.events, event] };
      }

      return state;
    }),
}));
