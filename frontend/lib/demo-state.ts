"use client";

import { create } from "zustand";

import {
  completePhase,
  createEvent,
  createNote,
  skipPhase,
  updateEvent,
  updateNote,
  updatePhase,
  updatePhaseAssignee,
  updatePracticeStatus,
} from "@/lib/api";
import { mapEventTypeToApi, type PracticeDetailUi } from "@/lib/mappers/practice";
import type { EventType, Practice, PracticeEvent, PracticePhase, PracticeStatus, User } from "@/lib/types";

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
  occurredAt?: string | null;
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
    { id: "label-2", name: "Beta Tester", tone: "info" },
    { id: "label-3", name: "Demo", tone: "success" },
  ],
  progress: 50,
  responsible: DEMO_USERS[0],
  startDate: "2026-01-22",
  status: "aperta",
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
];

const initialNotes: DemoNote[] = [];

function readStoredNotes() {
  if (typeof window === "undefined") return initialNotes;
  const raw = window.localStorage.getItem("epractice:notes");
  if (!raw) return initialNotes;
  try {
    const parsed = JSON.parse(raw) as DemoNote[];
    return parsed.filter((note) => note.id !== "note-01" && note.id !== "note-02");
  } catch {
    return initialNotes;
  }
}

type DemoAction =
  | { type: "set_user"; userId: string }
  | { type: "complete_phase"; phaseId: string }
  | { type: "reopen_phase"; phaseId: string }
  | { type: "skip_phase"; phaseId: string }
  | { type: "set_phase_status"; phaseId: string; status: PracticePhase["status"] }
  | { type: "set_practice_status"; status: Extract<PracticeStatus, "aperta" | "sospesa" | "chiusa"> }
  | { type: "update_phase"; phaseId: string; planned_end: string }
  | { type: "assign_phase"; phaseId: string; userId: string }
  | { type: "add_note"; phaseId?: string | null; body: string; occurredAt?: string }
  | { type: "update_note"; noteId: string; body: string; authorId?: string; occurredAt?: string }
  | { type: "create_event"; phaseId: string; eventType: EventType; title: string; description: string; occurredAt: string }
  | {
      type: "update_event";
      eventId: string;
      title: string;
      description: string;
      occurredAt: string;
      authorId?: string;
      phaseId?: string;
    }
  | { type: "hydrate_from_api"; detail: PracticeDetailUi };

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
  if (phases.length === 0) return { ...practiceValue, progress: 0 };
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function rememberUser(userId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("epractice:user-id", userId);
  }
}

function rememberNotes(notes: DemoNote[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("epractice:notes", JSON.stringify(notes));
  }
}

function syncActionWithApi(action: DemoAction, state: DemoState) {
  if (action.type === "complete_phase" && isUuid(action.phaseId)) {
    void completePhase(action.phaseId, state.activeUser.id).catch(console.warn);
  }

  if (action.type === "skip_phase" && isUuid(action.phaseId)) {
    void skipPhase(action.phaseId, state.activeUser.id).catch(console.warn);
  }

  // Nota: la sincronizzazione di set_phase_status verso il backend e' gestita
  // direttamente nel NodeDrawer per poter awaitare la chiamata prima di
  // invalidare le query React (necessario per leggere il recompute_status
  // della pratica appena rigenerato lato server).

  if (action.type === "assign_phase" && isUuid(action.phaseId)) {
    void updatePhaseAssignee(action.phaseId, action.userId, state.activeUser.id).catch(console.warn);
  }

  if (action.type === "update_phase" && isUuid(action.phaseId)) {
    void updatePhase(action.phaseId, { planned_end: action.planned_end }, state.activeUser.id).catch(console.warn);
  }

  if (action.type === "set_practice_status" && isUuid(state.practice.id)) {
    void updatePracticeStatus(state.practice.id, action.status, state.activeUser.id).catch(console.warn);
  }

  if (action.type === "add_note" && isUuid(state.practice.id)) {
    const linkedPhaseId = action.phaseId && isUuid(action.phaseId) ? action.phaseId : undefined;
    void createNote(
      {
        author_id: state.activeUser.id,
        content: action.body,
        ...(linkedPhaseId ? { phase_id: linkedPhaseId } : {}),
        practice_id: state.practice.id,
        ...(action.occurredAt ? { occurred_at: action.occurredAt } : {}),
      },
      state.activeUser.id,
    ).catch(console.warn);
  }

  if (action.type === "update_note" && isUuid(action.noteId)) {
    void updateNote(action.noteId, { content: action.body }, state.activeUser.id).catch(console.warn);
  }

  if (action.type === "create_event" && isUuid(action.phaseId) && isUuid(state.practice.id)) {
    void createEvent(
      {
        author_id: state.activeUser.id,
        description: action.description,
        event_date: action.occurredAt,
        event_type: mapEventTypeToApi(action.eventType),
        phase_id: action.phaseId,
        practice_id: state.practice.id,
        title: action.title,
        visual_position: action.eventType === "mail" ? "bottom" : "top",
      },
      state.activeUser.id,
    ).catch(console.warn);
  }

  if (action.type === "update_event" && isUuid(action.eventId)) {
    void updateEvent(
      action.eventId,
      {
        author_id: action.authorId,
        description: action.description,
        event_date: action.occurredAt,
        phase_id: action.phaseId,
        title: action.title,
      },
      state.activeUser.id,
    ).catch(console.warn);
  }
}

export const useDemoStore = create<DemoState>((set) => ({
  activeUser: DEMO_USERS[0],
  users: DEMO_USERS,
  practice,
  phases: initialPhases,
  events: initialEvents,
  notes: readStoredNotes(),
  applyAction: (action) =>
    set((state) => {
      if (action.type === "set_user") {
        rememberUser(action.userId);
        return { activeUser: state.users.find((user) => user.id === action.userId) ?? state.activeUser };
      }

      if (action.type === "hydrate_from_api") {
        return { ...action.detail };
      }

      if (state.activeUser.permission === "viewer") {
        return state;
      }

      syncActionWithApi(action, state);

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

      if (action.type === "update_phase") {
        return {
          phases: state.phases.map((phase) =>
            phase.id === action.phaseId ? { ...phase, dueDate: action.planned_end, plannedDate: action.planned_end } : phase,
          ),
        };
      }

      if (action.type === "set_practice_status") {
        return { practice: { ...state.practice, status: action.status } };
      }

      if (action.type === "assign_phase" && state.activeUser.permission === "admin") {
        const assignee = state.users.find((user) => user.id === action.userId);
        if (!assignee) return state;
        return {
          phases: state.phases.map((phase) => (phase.id === action.phaseId ? { ...phase, assignee } : phase)),
        };
      }

      if (action.type === "add_note") {
        const note: DemoNote & { occurredAt?: string } = {
          id: `note-${Date.now()}`,
          author: state.activeUser,
          body: action.body,
          createdAt: new Date().toISOString(),
          phaseId: action.phaseId ?? "",
          ...(action.occurredAt ? { occurredAt: action.occurredAt } : {}),
        };
        const notes = [note, ...state.notes];
        rememberNotes(notes);
        return {
          notes,
          phases: state.phases.map((phase) =>
            phase.id === action.phaseId ? { ...phase, notesCount: phase.notesCount + 1 } : phase,
          ),
        };
      }

      if (action.type === "update_note") {
        const newAuthor = action.authorId ? state.users.find((user) => user.id === action.authorId) : undefined;
        const notes = state.notes.map((note) =>
          note.id === action.noteId
            ? {
                ...note,
                body: action.body,
                ...(newAuthor ? { author: newAuthor } : {}),
                ...(action.occurredAt ? { occurredAt: action.occurredAt } : {}),
              }
            : note,
        );
        rememberNotes(notes);
        return { notes };
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

      if (action.type === "update_event") {
        const author = action.authorId ? state.users.find((user) => user.id === action.authorId) : undefined;
        return {
          events: state.events.map((event) =>
            event.id === action.eventId
              ? {
                  ...event,
                  author: author ?? event.author,
                  description: action.description,
                  occurredAt: action.occurredAt,
                  phaseId: action.phaseId ?? event.phaseId,
                  title: action.title,
                }
              : event,
          ),
        };
      }

      return state;
    }),
}));
