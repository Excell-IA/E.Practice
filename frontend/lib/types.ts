export type PracticeStatus = "aperta" | "in_attesa" | "sospesa" | "chiusa" | "archiviata";
export type PhaseStatus = "done" | "in_progress" | "pending" | "skipped" | "blocked";
export type EventType = "call" | "mail";

export type User = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export type Client = {
  id: string;
  name: string;
  vatNumber: string;
  city: string;
  industry: string;
  email?: string;
  phone?: string;
  source?: "econtacts" | "legacy" | "unavailable";
  targetType?: "azienda" | "persona";
};

export type PracticeLabel = {
  id: string;
  name: string;
  tone: "info" | "success" | "warning" | "danger" | "neutral";
};

export type Practice = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  categoryIcon: string;
  status: PracticeStatus;
  progress: number;
  client: Client;
  responsible: User;
  labels: PracticeLabel[];
  startDate: string;
  dueDate: string;
};

export type PracticePhase = {
  id: string;
  practiceId: string;
  order: number;
  title: string;
  description: string;
  status: PhaseStatus;
  plannedDate: string;
  dueDate: string;
  assignee: User;
  notesCount: number;
  attachmentsCount: number;
};

export type PracticeEvent = {
  id: string;
  practiceId: string;
  phaseId: string;
  type: EventType;
  title: string;
  description: string;
  occurredAt: string;
  author: User;
};

export type TreeSelection =
  | { kind: "phase"; item: PracticePhase }
  | { kind: "event"; item: PracticeEvent; phase: PracticePhase };
